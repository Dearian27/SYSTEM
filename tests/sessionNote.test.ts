import { describe, expect, it } from "vitest";
import {
  parsePlannedMap,
  parseSessionMap,
  updatePlanSection,
  updateSessionsSection,
} from "@/core/sessions/sessionNote";

describe("sessionNote", () => {
  it("inserts plan before sessions without deleting the sessions block", () => {
    const content = `# Daily\n\n## Sessions\n\`10:00\` | [[Actual Work]]\n\n## Notes\nHello\n`;

    const updated = updatePlanSection(
      content,
      new Map([["09:00", "Planned Work"]])
    );

    expect(updated).toContain("## Plan\n`09:00` | [[Planned Work]]");
    expect(updated).toContain("## Sessions\n`10:00` | [[Actual Work]]");
    expect(updated.indexOf("## Plan")).toBeLessThan(
      updated.indexOf("## Sessions")
    );
    expect(updated).toContain("## Notes\nHello");
  });

  it("updates sessions without deleting the existing plan block", () => {
    const content = `# Daily\n\n## Plan\n\`09:00\` | [[Planned Work]]\n\n## Sessions\n\n## Notes\nHello\n`;

    const updated = updateSessionsSection(
      content,
      new Map([["10:00", "Actual Work"]])
    );

    expect(updated).toContain("## Plan\n`09:00` | [[Planned Work]]");
    expect(updated).toContain("## Sessions\n`10:00` | [[Actual Work]]");
    expect(updated).toContain("## Notes\nHello");
  });

  it("parses plan and sessions independently", () => {
    const content = `## Plan\n\`09:00\` | [[Plan A]]\n\n## Sessions\n\`10:00\` | [[Actual B]]\n`;

    expect(parsePlannedMap(content)).toEqual(new Map([["09:00", "Plan A"]]));
    expect(parseSessionMap(content)).toEqual(new Map([["10:00", "Actual B"]]));
  });

  it("sorts entries by time when rewriting a section", () => {
    const content = "## Sessions\n";

    const updated = updateSessionsSection(
      content,
      new Map([
        ["11:00", "Later Work"],
        ["09:00", "Earlier Work"],
      ])
    );

    expect(updated).toContain(
      "## Sessions\n`09:00` | [[Earlier Work]]\n`11:00` | [[Later Work]]"
    );
  });

  it("ignores malformed lines while parsing", () => {
    const content = `## Sessions\n\`09:00\` | [[Valid Work]]\nnot-a-session\n10:00 | Missing Brackets\n`;

    expect(parseSessionMap(content)).toEqual(new Map([["09:00", "Valid Work"]]));
  });
});
