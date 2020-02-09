import { z } from "../deps.ts";
import MD from "./utils/md.ts";

const numeric = z.string().regex(/^\d+$/).transform(Number);

export type FormatOptions = {
  collapseInstructionGroups: boolean;
  hideComments: boolean;
  hideInstructionId: boolean;
  ignoredRules: number[];
};

export const defaultFormatOptions: FormatOptions = {
  collapseInstructionGroups: false,
  hideComments: false,
  hideInstructionId: false,
  ignoredRules: [],
};

const GenericInstructionSchema = z.object({
  comments: z.array(z.string()).default([]),
  hideOnIgnoredRules: z.array(z.number()).default([]),
  showOnIgnoredRules: z.array(z.number()).default([]),
});

export type GenericInstruction = z.infer<typeof GenericInstructionSchema>;

export default abstract class Guide<Instruction extends GenericInstruction> {
  protected abstract instructionsSchema: z.ZodType;
  protected abstract name: string;

  private categories: string[];
  private description: string;
  private gameTitle: string;
  private rules: Record<number, string>;

  protected instructions: Instruction[];

  constructor() {
    this.categories = [];
    this.description = "";
    this.gameTitle = "";
    this.instructions = [];
    this.rules = [];
  }

  parse(maybeGuide: unknown): void {
    const schema = z.object({
      categories: z.array(z.string()),
      description: z.string(),
      gameTitle: z.string(),
      instructions: z.array(
        z.intersection(GenericInstructionSchema, this.instructionsSchema)
      ),
      rules: z.record(numeric, z.string()),
    });

    const guideModel = schema.parse(maybeGuide);

    this.categories = guideModel.categories;
    this.description = guideModel.description;
    this.gameTitle = guideModel.gameTitle;
    this.instructions = guideModel.instructions;
    this.rules = guideModel.rules;
  }

  format(options?: Partial<FormatOptions>): string {
    return `\
${this.formatHeader()}

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
      .par(this.description)
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

  abstract formatInstructions(options?: Partial<FormatOptions>): string;

  protected filterInstructions(
    partialOptions?: Partial<FormatOptions>
  ): Instruction[] {
    const options = { ...defaultFormatOptions, ...partialOptions };

    return this.instructions.filter((instruction) => {
      if (instruction.showOnIgnoredRules.length > 0) {
        return instruction.showOnIgnoredRules.some((rule) =>
          options.ignoredRules.includes(rule)
        );
      }

      if (instruction.hideOnIgnoredRules.length > 0) {
        return !instruction.hideOnIgnoredRules.some((rule) =>
          options.ignoredRules.includes(rule)
        );
      }

      return true;
    });
  }
}