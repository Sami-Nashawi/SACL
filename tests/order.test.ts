import { describe, expect, it } from "vitest";
import { orderAlong, partName } from "@/lib/order";

const seg = (name: string, e: number, n: number) => ({ name, pts: [{ e, n }, { e: e + 20, n: n + 1 }] });
const names = (xs: { name: string }[]) => xs.map((x) => x.name).join(",");

describe("orderAlong: parts numbered along the road", () => {
  it("west to east for a road that runs east-west, whatever the drawing order", () => {
    expect(names(orderAlong([seg("c", 300, 5), seg("a", 0, 0), seg("d", 450, 8), seg("b", 130, 2)]))).toBe("a,b,c,d");
  });
  it("south to north for a road that runs north-south", () => {
    const v = (name: string, n: number) => ({ name, pts: [{ e: 1000 + n * 0.01, n }, { e: 1000, n: n + 20 }] });
    expect(names(orderAlong([v("c", 300), v("a", 0), v("b", 150)]))).toBe("a,b,c");
  });
  it("along a diagonal road, from the south-west end to the north-east end", () => {
    expect(names(orderAlong([seg("c", 400, 400), seg("a", 0, 0), seg("b", 200, 200)]))).toBe("a,b,c");
  });
  it("keeps working for one item, identical positions, and an empty list", () => {
    expect(orderAlong([])).toEqual([]);
    expect(names(orderAlong([seg("x", 1, 1)]))).toBe("x");
    expect(orderAlong([seg("p", 5, 5), seg("q", 5, 5)])).toHaveLength(2);
  });
  it("does not change the lines themselves", () => {
    const input = [seg("b", 100, 0), seg("a", 0, 0)]; const out = orderAlong(input);
    expect(out[0]).toBe(input[1]); expect(input[0].name).toBe("b");
  });
});

describe("partName", () => {
  it("numbers several parts and leaves a single part unnumbered", () => {
    expect(partName("Irrigation 600 mm", 2, 5)).toBe("Irrigation 600 mm 2");
    expect(partName("PW", 1, 1)).toBe("PW");
  });
});
