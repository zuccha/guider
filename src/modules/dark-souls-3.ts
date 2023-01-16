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

const NameSchema = z.string().min(1);

const InstructionSchema = z.intersection(
  z.object({ area: z.string(), optional: z.boolean().default(false) }),
  z.union([
    z.object({
      type: z.literal("allot-estus"),
      from: z.enum(["ashen", "normal"]),
      to: z.enum(["ashen", "normal"]),
      quantity: z.union([z.literal("all"), z.number().min(1)]).default("all"),
    }),
    z.object({
      type: z.literal("burn-undead-bone-shards"),
      amount: z.number().optional(),
    }),
    z.object({
      type: z.literal("buy-items"),
      items: z.array(ItemSchema),
      vendor: NameSchema,
    }),
    z.object({
      type: z.literal("cast-spells"),
      spells: z.array(NameSchema).min(1),
    }),
    z.object({
      type: z.literal("comment"),
      text: NameSchema,
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
      boss: NameSchema,
      items: z.array(ItemSchema).default([]),
      spells: z.array(NameSchema).default([]),
    }),
    z.object({
      type: z.literal("grab-items"),
      items: z.array(ItemSchema).min(1),
      where: NameSchema,
    }),
    z.object({
      type: z.literal("kill-lizards"),
      amount: z.number().min(1).default(1),
      rewards: z.array(ItemSchema).min(1),
      where: z.string(),
    }),
    z.object({
      type: z.literal("light-bonfire"),
      bonfire: NameSchema,
    }),
    z.object({
      type: z.literal("reinforce-estus"),
      amount: z.number().optional(),
    }),
    z.object({
      type: z.literal("trade"),
      item: NameSchema,
      reward: NameSchema,
    }),
    z.object({
      type: z.literal("two-hand"),
      weapon: NameSchema,
    }),
    z.object({
      type: z.literal("unequip"),
      items: z.array(NameSchema).min(1),
    }),
    z.object({
      type: z.literal("unlock-shortcut"),
      where: NameSchema,
    }),
    z.object({
      type: z.literal("upgrade-weapon"),
      weapon: NameSchema,
      level: z.number().positive().optional(),
      infusion: NameSchema.optional(),
    }),
    z.object({
      type: z.literal("use-items"),
      items: z.array(ItemSchema).min(1),
    }),
    z.object({
      type: z.literal("warp"),
      bonfire: z.string().optional(),
      using: NameSchema.optional(),
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
  const formatInstructionByType = (): string => {
    switch (i.type) {
      case "allot-estus": {
        const estus = i.quantity === 1 ? "Estus Flask" : "Estus Flasks";
        const from = MD.i(`${capitalize(i.from)} ${estus}`);
        const to = MD.i(`${capitalize(i.to)} ${estus}`);
        return `Allot ${i.quantity} ${from} to ${to}`;
      }
      case "burn-undead-bone-shards": {
        const amount = i.amount ?? "all";
        const shard = amount === 1 ? "Undead Bone Shard" : "Undead Bone Shards";
        return `Burn ${amount} ${MD.i(shard)} at the bonfire`;
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
        if (i.spells.length > 0)
          i.comments.unshift(
            `Cast ${i.spells.map((spell) => `${MD.i(spell)}`).join(", ")}`
          );
        if (i.items.length > 0)
          i.comments.unshift(
            `Use ${i.items
              .map((item) => `${MD.i(item.name)} (${item.quantity})`)
              .join(", ")}`
          );
        return `Fight ${MD.i(i.boss)}`;
      }
      case "grab-items": {
        return i.where
          ? `Grab ${mapItems(i.items)} ${i.where}`
          : `Grab ${mapItems(i.items)}`;
      }
      case "kill-lizards": {
        const lizards = i.amount === 1 ? "lizard" : `${i.amount} lizards`;
        return `Kill ${lizards} ${i.where} for ${mapItems(i.rewards)}`;
      }
      case "light-bonfire": {
        return `Light ${MD.i(i.bonfire)} bonfire`;
      }
      case "reinforce-estus": {
        const amount = i.amount ?? "all";
        const estus = amount === 1 ? "Estus Flask" : "Estus Flasks";
        return `Reinforce ${amount} ${MD.i(estus)} by ${MD.i("Andre")}`;
      }
      case "trade": {
        const pickle = MD.i("Pickle Pee");
        return `Trade a ${MD.i(i.item)} for a ${MD.i(i.reward)} with ${pickle}`;
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
      case "upgrade-weapon": {
        const infusion = i.infusion ? MD.i(i.infusion) : "";
        const level = i.level ? `+${i.level}` : "";
        if (infusion && level)
          return `Infuse ${i.weapon} with ${infusion} and upgrade to ${level}`;
        if (infusion) return `Infuse ${i.weapon} with ${infusion}`;
        if (level) return `Upgrade ${i.weapon} to ${level}`;
        return `Upgrade ${i.weapon}`;
      }
      case "use-items": {
        return `Use ${i.items
          .map((item) => `${MD.i(item.name)} (${item.quantity})`)
          .join(", ")}`;
      }
      case "warp": {
        const using = i.using ? ` using ${MD.i(i.using)}` : "";
        return i.bonfire
          ? `Warp to ${MD.i(i.bonfire)}${using}`
          : `Warp to last bonfire rested at${using}`;
      }
    }
  };

  const formattedInstruction = MD.b(formatInstructionByType());
  return i.optional
    ? `${MD.i("[optional] ")}${formattedInstruction}`
    : formattedInstruction;
};

export default class DarkSouls3Guide extends Guide<Instruction> {
  protected instructionsSchema = InstructionSchema;
  protected name = "Dark Souls III";

  formatInstructions(partialOptions?: Partial<FormatOptions>): string {
    const options = { ...defaultFormatOptions, ...partialOptions };

    const instructions = this.filterInstructions(options);

    if (instructions.length === 0) {
      return MD.i("There are no instructions");
    }

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

    const rows: string[][] = [];

    for (let i = 0; i < instructions.length; ++i) {
      const instruction = instructions[i];
      const formattedInstruction =
        formatInstruction(instruction) +
        this.formatComments(instruction, options);
      rows.push([`${i}`, MD.b(instruction.area), formattedInstruction]);
    }

    if (options.collapseInstructionGroups) {
      let i = 1;
      while (i < rows.length) {
        const prevRow = rows[i - 1];
        const row = rows[i];
        if (prevRow[1] === row[1]) {
          prevRow[2] += "<br><br>" + row[2];
          rows.splice(i, 1);
          continue;
        }
        ++i;
      }
    }

    if (options.hideInstructionId) {
      for (let i = 0; i < rows.length; ++i) {
        rows[i].splice(0, 1);
      }
    }

    return MD.start().section("Instructions").table(columns, rows).end();
  }
}
