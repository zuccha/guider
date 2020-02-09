import { z } from "../deps.ts";
import Guide, { GenericInstruction } from "./guide.ts";
import DarkSouls3Guide from "./modules/dark-souls-3.ts";

const PartialGuideSchema = z.object({
  _schema: z.enum(["dark-souls-3"]),
});

const GuideModuleBySchema = {
  "dark-souls-3": DarkSouls3Guide,
} as const;

const parseGuide = (content: string): Guide<GenericInstruction> => {
  const maybeGuide = JSON.parse(content);
  const partialGuide = PartialGuideSchema.parse(maybeGuide);
  const GuideModule = GuideModuleBySchema[partialGuide._schema];
  const guide = new GuideModule();
  guide.parse(maybeGuide);
  return guide;
};

export default parseGuide;
