import {
  BaseBoxShapeUtil,
  Geometry2d,
  HTMLContainer,
  Rectangle2d,
  TLBaseShape,
  TLShapeUtilConstructor,
  TLResizeInfo,
  resizeBox,
} from "tldraw";
import { T } from "@tldraw/validate";

export type ChatNodeShape = TLBaseShape<"chat_node", { w: number; h: number; title: string }>;
export type ArtifactNodeShape = TLBaseShape<
  "artifact_node",
  { w: number; h: number; title: string }
>;
export type ScratchpadNodeShape = TLBaseShape<
  "scratchpad_node",
  { w: number; h: number; title: string }
>;

export const chatNodeProps = {
  w: T.number,
  h: T.number,
  title: T.string,
};

export const artifactNodeProps = {
  w: T.number,
  h: T.number,
  title: T.string,
};

export const scratchpadNodeProps = {
  w: T.number,
  h: T.number,
  title: T.string,
};

export class ChatNodeShapeUtil extends BaseBoxShapeUtil<ChatNodeShape> {
  static override type = "chat_node" as const;
  static override props = chatNodeProps;

  override getDefaultProps(): ChatNodeShape["props"] {
    return { w: 320, h: 220, title: "Chat" };
  }

  override component(shape: ChatNodeShape) {
    return (
      <HTMLContainer className="cadence-shape cadence-chat">
        <div className="cadence-shape__title">Chat</div>
        <div className="cadence-shape__body">{shape.props.title}</div>
      </HTMLContainer>
    );
  }

  override getGeometry(shape: ChatNodeShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override onResize(shape: ChatNodeShape, info: TLResizeInfo<ChatNodeShape>) {
    return resizeBox(shape, info);
  }
}

export class ArtifactNodeShapeUtil extends BaseBoxShapeUtil<ArtifactNodeShape> {
  static override type = "artifact_node" as const;
  static override props = artifactNodeProps;

  override getDefaultProps(): ArtifactNodeShape["props"] {
    return { w: 320, h: 220, title: "Artifact" };
  }

  override component(shape: ArtifactNodeShape) {
    return (
      <HTMLContainer className="cadence-shape cadence-artifact">
        <div className="cadence-shape__title">Artifact</div>
        <div className="cadence-shape__body">{shape.props.title}</div>
      </HTMLContainer>
    );
  }

  override getGeometry(shape: ArtifactNodeShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override onResize(shape: ArtifactNodeShape, info: TLResizeInfo<ArtifactNodeShape>) {
    return resizeBox(shape, info);
  }
}

export class ScratchpadNodeShapeUtil extends BaseBoxShapeUtil<ScratchpadNodeShape> {
  static override type = "scratchpad_node" as const;
  static override props = scratchpadNodeProps;

  override getDefaultProps(): ScratchpadNodeShape["props"] {
    return { w: 320, h: 220, title: "Scratchpad" };
  }

  override component(shape: ScratchpadNodeShape) {
    return (
      <HTMLContainer className="cadence-shape cadence-scratchpad">
        <div className="cadence-shape__title">Scratchpad</div>
        <div className="cadence-shape__body">{shape.props.title}</div>
      </HTMLContainer>
    );
  }

  override getGeometry(shape: ScratchpadNodeShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override onResize(shape: ScratchpadNodeShape, info: TLResizeInfo<ScratchpadNodeShape>) {
    return resizeBox(shape, info);
  }
}

export const cadenceShapeUtils: TLShapeUtilConstructor[] = [
  ChatNodeShapeUtil,
  ArtifactNodeShapeUtil,
  ScratchpadNodeShapeUtil,
];
