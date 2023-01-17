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
  z.object({
    area: z.string(),
  }),
  z.union([
    z.object({
      type: z.literal("allot-estus"),
      from: z.enum(["ashen", "normal"]),
      to: z.enum(["ashen", "normal"]),
      quantity: z.union([z.literal("all"), z.number().min(1)]).default("all"),
    }),
    z.object({
      type: z.literal("attune-spells"),
      spells: z.array(NameSchema).min(1),
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
      type: z.literal("change-equipment"),
      equip: z.array(NameSchema).default([]),
      unequip: z.array(NameSchema).default([]),
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
        ? `${MD.bi(item.name)} (${item.quantity})`
        : MD.bi(item.name)
    )
    .join(", ");

const formatDarkSouls3Instruction = (i: Instruction): string => {
  const formatInstructionByType = (): string => {
    switch (i.type) {
      case "allot-estus": {
        const estus = i.quantity === 1 ? "Estus Flask" : "Estus Flasks";
        const from = MD.bi(`${capitalize(i.from)} ${estus}`);
        const to = MD.bi(`${capitalize(i.to)} ${estus}`);
        return `Allot ${i.quantity} ${from} to ${to}`;
      }
      case "attune-spells": {
        return `Attune ${i.spells.map((spell) => MD.bi(spell)).join(", ")}`;
      }
      case "burn-undead-bone-shards": {
        const amount = i.amount ?? "all";
        const shard = amount === 1 ? "Undead Bone Shard" : "Undead Bone Shards";
        return `Burn ${amount} ${MD.bi(shard)} at the bonfire`;
      }
      case "buy-items": {
        return `Buy ${mapItems(i.items)} from ${i.vendor}`;
      }
      case "cast-spells": {
        return `Cast ${i.spells.map((spell) => MD.bi(spell)).join(", ")}`;
      }
      case "change-equipment": {
        const equips = i.equip.map((item) => MD.bi(item)).join(", ");
        const unequips = i.unequip.map((item) => MD.bi(item)).join(", ");
        const changes = [];
        if (equips) changes.push(`equip ${equips}`);
        if (unequips) changes.push(`unequip ${unequips}`);
        return capitalize(changes.join(" and "));
      }
      case "comment": {
        return i.text;
      }
      case "create-character": {
        const className = MD.bi(i.class);
        const burialGift = MD.bi(i.burialGift);
        return `Choose ${className} class and ${burialGift} burial gift`;
      }
      case "fight-boss": {
        let fight = `Fight ${MD.bi(i.boss)}`;
        if (i.spells.length > 0)
          fight += `<br>- Cast ${i.spells
            .map((spell) => `${MD.i(spell)}`)
            .join(", ")}`;
        if (i.items.length > 0)
          fight += `<br>- Use ${i.items
            .map((item) => `${MD.i(item.name)} (${item.quantity})`)
            .join(", ")}`;
        return fight;
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
        return `Light ${MD.bi(i.bonfire)} bonfire`;
      }
      case "reinforce-estus": {
        const amount = i.amount ?? "all";
        const estus = amount === 1 ? "Estus Flask" : "Estus Flasks";
        return `Reinforce ${amount} ${MD.bi(estus)} by ${MD.i("Andre")}`;
      }
      case "trade": {
        const item = MD.bi(i.item);
        const reward = MD.bi(i.reward);
        const pickle = MD.i("Pickle Pee");
        return `Trade a ${item} for a ${reward} with ${pickle}`;
      }
      case "two-hand": {
        return `Two-hand ${MD.bi(i.weapon)}`;
      }
      case "unlock-shortcut": {
        return `Unlock shortcut ${i.where}`;
      }
      case "upgrade-weapon": {
        const weapon = MD.bi(i.weapon);
        const infusion = i.infusion ? MD.i(i.infusion) : "";
        const level = i.level ? `+${i.level}` : "";
        if (infusion && level)
          return `Infuse ${weapon} with ${infusion} and upgrade to ${level}`;
        if (infusion) return `Infuse ${weapon} with ${infusion}`;
        if (level) return `Upgrade ${weapon} to ${level}`;
        return `Upgrade ${weapon}`;
      }
      case "use-items": {
        return `Use ${i.items
          .map((item) => `${MD.bi(item.name)} (${item.quantity})`)
          .join(", ")}`;
      }
      case "warp": {
        const using = i.using ? ` using ${MD.bi(i.using)}` : "";
        return i.bonfire
          ? `Warp to ${MD.bi(i.bonfire)}${using}`
          : `Warp to last bonfire rested at${using}`;
      }
    }
  };

  const formattedInstruction = formatInstructionByType();

  if (i.safety) {
    return `${MD.i("[peachy]")} ${formattedInstruction}`;
  }

  if (i.optional) {
    return `${MD.i("[optional]")} ${formattedInstruction}`;
  }

  return formattedInstruction;
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
        formatDarkSouls3Instruction(instruction) +
        this.formatComments(instruction, options);
      rows.push([`${i}`, instruction.area, formattedInstruction]);
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
