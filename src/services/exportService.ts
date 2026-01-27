import { save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import JSZip from "jszip";
import { compileArtifactToDocx } from "./docxCompiler";
import { getVersion } from "./versionService";
import { createBuild } from "./buildService";
import { getDbPath } from "./db";
import { getProject } from "./projectService";
import { validateOrRepairArtifactIR } from "./artifactIRService";
import { getProviderBundle } from "./llm/registry";

export async function exportArtifactVersionToDocx(params: {
  artifactVersionId: string;
  templateId?: string | null;
}) {
  const version = await getVersion(params.artifactVersionId);
  if (!version) throw new Error("Artifact version not found.");

  const repairProvider = getProviderBundle().repair;
  const { ir } = await validateOrRepairArtifactIR(version.content_json, repairProvider);
  const docx = await compileArtifactToDocx(ir);

  const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
  if (!isTauri) {
    const blob = new Blob([docx.bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${ir.artifact.title}.docx`;
    anchor.click();
    URL.revokeObjectURL(url);
    return "download";
  }

  const filePath = await save({
    defaultPath: `${ir.artifact.title}.docx`,
    filters: [{ name: "DOCX", extensions: ["docx"] }],
  });
  if (!filePath) return null;

  await writeFile(filePath, docx.bytes);
  await createBuild({
    artifact_version_id: version.id,
    target: "docx",
    template_id: params.templateId ?? ir.artifact.template,
    file_name: filePath.split("/").pop() ?? "export.docx",
    file_path: filePath,
  });
  return filePath;
}

export async function exportProjectBundle(params: { projectId: string }) {
  const project = await getProject(params.projectId);
  if (!project) throw new Error("Project not found.");

  const dbPath = await getDbPath();
  const dbBytes = await readFile(dbPath);

  const manifest = {
    project: {
      id: project.id,
      name: project.name,
      created_at: project.created_at,
    },
    exported_at: new Date().toISOString(),
  };

  const zip = new JSZip();
  zip.file("cadence.db", dbBytes);
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const bundle = await zip.generateAsync({ type: "uint8array" });
  const filePath = await save({
    defaultPath: `${project.name.replace(/\\s+/g, "_")}_bundle.zip`,
    filters: [{ name: "ZIP", extensions: ["zip"] }],
  });
  if (!filePath) return null;

  await writeFile(filePath, bundle);
  return filePath;
}
