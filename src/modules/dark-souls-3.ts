import { z } from "../../deps.ts";
import Guide, {
  defaultFormatOptions,
  FormatOptions,
  GenericInstruction,
} from "../guide.ts";
import MD, { MDTableColumn } from "../utils/md.ts";

const ItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().default(1),
});

type Item = z.infer<typeof ItemSchema>;

const InstructionSchema = z.intersection(
  z.object({ area: z.string() }),
  z.union([
    z.object({
      type: z.literal("allot-estus"),
      from: z.enum(["ashen", "normal"]),
      to: z.enum(["ashen", "normal"]),
      quantity: z.union([z.literal("all"), z.number().min(1)]).default("all"),
    }),
    z.object({
      type: z.literal("buy-items"),
      items: z.array(ItemSchema),
      vendor: z.string().min(1),
    }),
    z.object({
      type: z.literal("cast-spells"),
      spells: z.array(z.string().min(1)).min(1),
    }),
    z.object({
      type: z.literal("comment"),
      text: z.string().min(1),
    }),
    z.object({
      type: z.literal("create-character"),
      burialGift: z.enum([
        "Black Firebomb",
        "Cracked Red Eye Orb",
        "Divine Blessing",
        "Fire Gem",
        "Gold Coin",
        "Hidden Blessing",
        "Life Ring",
        "Sovereignless Soul",
        "Young White Branch",
      ]),
      class: z.enum([
        "Assassin",
        "Cleric",
        "Deprived",
        "Herald",
        "Knight",
        "Mercenary",
        "Pyromancer",
        "Sorcerer",
        "Thief",
        "Warrior",
      ]),
    }),
    z.object({
      type: z.literal("equip"),
      items: z.array(z.string()).min(1),
    }),
    z.object({
      type: z.literal("fight-boss"),
      boss: z.string().min(1),
      items: z.array(ItemSchema).default([]),
      spells: z.array(z.string().min(1)).default([]),
    }),
    z.object({
      type: z.literal("grab-items"),
      items: z.array(ItemSchema).min(1),
      where: z.string().min(1),
    }),
    z.object({
      type: z.literal("kill-lizard"),
      rewards: z.array(ItemSchema).min(1),
      where: z.string(),
    }),
    z.object({
      type: z.literal("light-bonfire"),
      bonfire: z.string().min(1),
    }),
    z.object({
      type: z.literal("two-hand"),
      weapon: z.string().min(1),
    }),
    z.object({
      type: z.literal("unequip"),
      items: z.array(z.string()).min(1),
    }),
    z.object({
      type: z.literal("unlock-shortcut"),
      where: z.string().min(1),
    }),
    z.object({
      type: z.literal("use-items"),
      items: z.array(ItemSchema).min(1),
    }),
    z.object({
      type: z.literal("warp"),
      bonfire: z.string().optional(),
    }),
  ])
);

type Instruction = GenericInstruction & z.infer<typeof InstructionSchema>;

const capitalize = (word: string): string => {
  return word === "" ? "" : `${word[0].toUpperCase()}${word.substring(1)}`;
};

const mapItems = (items: Item[]): string =>
  items
    .map((item) =>
      item.quantity > 1
        ? `${MD.i(item.name)} (${item.quantity})`
        : MD.i(item.name)
    )
    .join(", ");

const formatInstruction = (i: Instruction): string => {
  switch (i.type) {
    case "allot-estus": {
      const from = MD.i(`${capitalize(i.from)} Estus Flask`);
      const to = MD.i(`${capitalize(i.to)} Estus Flask`);
      return `Allot ${i.quantity} ${from} to ${to}`;
    }
    case "buy-items": {
      return `Buy ${mapItems(i.items)} from ${i.vendor}`;
    }
    case "cast-spells": {
      return `Cast ${i.spells.map((spell) => MD.i(spell)).join(", ")}`;
    }
    case "comment": {
      return i.text;
    }
    case "create-character": {
      const className = MD.i(i.class);
      const burialGift = MD.i(i.burialGift);
      return `Choose ${className} class and ${burialGift} burial gift`;
    }
    case "equip": {
      return `Equip ${i.items.map((item) => MD.i(item)).join(", ")}`;
    }
    case "fight-boss": {
      const consumables =
        i.items.length > 0
          ? `<br>! Use ${i.items
              .map((item) => `${MD.i(item.name)} (${item.quantity})`)
              .join(", ")}`
          : "";
      const spells =
        i.spells.length > 0
          ? `<br>! Cast ${i.spells.map((spell) => `${MD.i(spell)}`).join(", ")}`
          : "";
      return `Fight ${MD.i(i.boss)}${spells}${consumables}`;
    }
    case "grab-items": {
      return i.where
        ? `Grab ${mapItems(i.items)} ${i.where}`
        : `Grab ${mapItems(i.items)}`;
    }
    case "kill-lizard": {
      return `Kill lizard ${i.where} for ${mapItems(i.rewards)}`;
    }
    case "light-bonfire": {
      return `Light ${MD.i(i.bonfire)} bonfire`;
    }
    case "two-hand": {
      return `Two-hand ${MD.i(i.weapon)}`;
    }
    case "unlock-shortcut": {
      return `Unlock shortcut ${i.where}`;
    }
    case "unequip": {
      return `Unequip ${i.items.map((item) => MD.i(item)).join(", ")}`;
    }
    case "use-items": {
      return `Use ${i.items
        .map((item) => `${MD.i(item.name)} (${item.quantity})`)
        .join(", ")}`;
    }
    case "warp": {
      return i.bonfire
        ? `Warp to ${MD.i(i.bonfire)}`
        : `Warp to last bonfire rested at`;
    }
  }
};

export default class DarkSouls3Guide extends Guide<Instruction> {
  protected instructionsSchema = InstructionSchema;
  protected name = "Dark Souls III";

  formatInstructions(partialOptions?: Partial<FormatOptions>): string {
    const options = { ...defaultFormatOptions, ...partialOptions };

    const instructions = this.filterInstructions(options);

    const columns: MDTableColumn[] = options.hideInstructionId
      ? [
          { title: "Area", alignment: "left" },
          { title: "Action", alignment: "left" },
        ]
      : [
          { title: "Id", alignment: "right" },
          { title: "Area", alignment: "left" },
          { title: "Action", alignment: "left" },
        ];

    const rows = instructions.map((instruction, index) => {
      const formattedInstruction =
        formatInstruction(instruction) +
        this.formatComments(instruction, options);

      const area =
        index === 0 ||
        !options.collapseInstructionGroups ||
        instructions[index - 1].area !== instruction.area
          ? instruction.area
          : "";

      return options.hideInstructionId
        ? [area, formattedInstruction]
        : [`${index}`, area, formattedInstruction];
    });

    return MD.start().section("Instructions").table(columns, rows).end();
  }
}
