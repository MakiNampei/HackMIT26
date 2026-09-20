import { describe, expect, it } from "vitest";
import { dueSessionReminders } from "./session-reminders";
import type { Session } from "./types";

const session: Session = {
  id: "session", creatorId: "owner", memberIds: ["member"], courseId: "course",
  title: "Study", topic: "Topic", type: "study", status: "confirmed",
  minPeople: 2, maxPeople: 4, durationMinutes: 1, proposedSlots: [],
  confirmedSlot: { start: new Date(10000).toISOString(), end: new Date(70000).toISOString() },
};
describe("session reminders", () => {
  it("reminds members and organizers at the start boundary", () => {
    for (const user of ["owner", "member"]) expect(dueSessionReminders([session], user, 9999, 10000)[0]?.phase).toBe("start");
  });
  it("reminds at the end and does not repeat a crossed boundary", () => {
    expect(dueSessionReminders([session], "member", 69999, 70000)[0]?.phase).toBe("end");
    expect(dueSessionReminders([session], "member", 70000, 70001)).toEqual([]);
  });
  it("only reports the end after sleeping through a session", () => {
    expect(dueSessionReminders([session], "member", 0, 80000).map(item => item.phase)).toEqual(["end"]);
  });
  it("ignores unrelated, unscheduled, invalid and old sessions", () => {
    expect(dueSessionReminders([session], "stranger", 0, 80000)).toEqual([]);
    expect(dueSessionReminders([{ ...session, confirmedSlot: undefined }], "owner", 0, 80000)).toEqual([]);
    expect(dueSessionReminders([{ ...session, confirmedSlot: { start: "invalid", end: "invalid" } }], "owner", 0, 80000)).toEqual([]);
    expect(dueSessionReminders([session], "owner", 80000, 90000)).toEqual([]);
  });
});
