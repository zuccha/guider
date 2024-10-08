import { z } from "../deps.ts";
import MD from "./utils/md.ts";

const numeric = z.string().regex(/^\d+$/).transform(Number);

export type FormatOptions = {
  collapseInstructionGroups: boolean;
  hideComments: boolean;
  hideInstructionId: boolean;
  hideOptional: boolean;
  hideSafety: boolean;
  ignoredRules: number[];
};

export const defaultFormatOptions: FormatOptions = {
  collapseInstructionGroups: false,
  hideComments: false,
  hideInstructionId: false,
  hideOptional: false,
  hideSafety: false,
  ignoredRules: [],
};

const GenericInstructionSchema = z.object({
  comments: z.array(z.string()).default([]),
  hideOnIgnoredRules: z.array(z.number()).default([]),
  showOnIgnoredRules: z.array(z.number()).default([]),
  optional: z.boolean().default(false),
  safety: z.boolean().default(false),
});

export type GenericInstruction = z.infer<typeof GenericInstructionSchema>;

const errorMap: z.ZodErrorMap = (error, ctx) => {
  if (error.message) return { message: error.message };

  return {
    message: ctx.data
      ? ctx.defaultError + ": " + JSON.stringify(ctx.data)
      : ctx.defaultError,
  };
};

export default abstract class Guide<Instruction extends GenericInstruction> {
  protected abstract instructionsSchema: z.ZodType;
  protected abstract name: string;

  private categories: string[];
  private description: string[];
  private resources: string[];
  private gameTitle: string;
  private rules: Record<number, string>;

  protected instructions: Instruction[];

  constructor() {
    this.categories = [];
    this.description = [];
    this.resources = [];
    this.gameTitle = "";
    this.instructions = [];
    this.rules = [];
  }

  getName(): string {
    return this.name;
  }

  getRules(options: { isImpactful?: boolean } = {}): Record<number, string> {
    const isImpactful = options.isImpactful ?? false;
    if (!isImpactful) {
      return this.rules;
    }

    const impactfulRuleIds = new Set<number>();
    this.instructions.forEach((instruction) => {
      instruction.hideOnIgnoredRules.forEach((rule) =>
        impactfulRuleIds.add(rule)
      );
      instruction.showOnIgnoredRules.forEach((rule) =>
        impactfulRuleIds.add(rule)
      );
    });

    const impactfulRules: Record<number, string> = {};
    impactfulRuleIds.forEach((id) => (impactfulRules[id] = this.rules[id]));
    return impactfulRules;
  }

  parse(maybeGuide: unknown): void {
    const schema = z.object({
      categories: z.array(z.string()),
      description: z.array(z.string()).min(1),
      resources: z.array(z.string()).default([]),
      gameTitle: z.string(),
      instructions: z.array(
        z.intersection(GenericInstructionSchema, this.instructionsSchema)
      ),
      rules: z.record(numeric, z.string()),
    });

    const guideModel = schema.parse(maybeGuide, { errorMap });

    this.categories = guideModel.categories;
    this.description = guideModel.description;
    this.resources = guideModel.resources;
    this.gameTitle = guideModel.gameTitle;
    this.instructions = guideModel.instructions;
    this.rules = guideModel.rules;
  }

  format(options?: Partial<FormatOptions>): string {
    return `\
${this.formatHeader()}

${this.formatResources()}

${this.formatRules(options)}

${this.formatInstructions(options)}`;
  }

  formatHeader(): string {
    return MD.start()
      .title(
        this.categories.length === 0
          ? this.gameTitle
          : `${this.gameTitle} - ${this.categories.join(", ")}`
      )
      .pars(this.description)
      .end();
  }

  formatRules(partialOptions?: Partial<FormatOptions>): string {
    const options = { ...defaultFormatOptions, ...partialOptions };

    const rules = Object.entries(this.rules).sort((rule1, rule2) => {
      if (Number(rule1[0]) < Number(rule2[0])) return -1;
      if (Number(rule1[0]) > Number(rule2[0])) return 1;
      return 0;
    });

    if (rules.length === 0) {
      return "";
    }

    return MD.start()
      .section("Rules")
      .par("The run includes the following restrictions:")
      .ordered(
        rules.map((rule) =>
          options.ignoredRules.includes(Number(rule[0]))
            ? MD.s(rule[1])
            : rule[1]
        )
      )
      .end();
  }

  formatResources(): string {
    if (this.resources.length === 0) {
      return "";
    }

    return MD.start()
      .section("Resources")
      .par("Other useful resources:")
      .unordered(this.resources)
      .end();
  }

  abstract formatInstructions(options?: Partial<FormatOptions>): string;

  protected formatComments(
    instruction: GenericInstruction,
    partialOptions?: Partial<FormatOptions>
  ): string {
    const options = { ...defaultFormatOptions, ...partialOptions };
    return options.hideComments
      ? ""
      : instruction.comments.map((comment) => `<br>- ${comment}`).join("");
  }

  protected filterInstructions(
    partialOptions?: Partial<FormatOptions>
  ): Instruction[] {
    const options = { ...defaultFormatOptions, ...partialOptions };

    return this.instructions.filter((instruction) => {
      if (options.hideOptional && instruction.optional) {
        return false;
      }

      if (options.hideSafety && instruction.safety) {
        return false;
      }

      if (
        instruction.showOnIgnoredRules.length > 0 &&
        instruction.showOnIgnoredRules.some(
          (rule) => !options.ignoredRules.includes(rule)
        )
      ) {
        return false;
      }

      if (
        instruction.hideOnIgnoredRules.length > 0 &&
        instruction.hideOnIgnoredRules.some((rule) =>
          options.ignoredRules.includes(rule)
        )
      ) {
        return false;
      }

      return true;
    });
  }
}
