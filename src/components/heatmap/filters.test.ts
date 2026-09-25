import { describe, expect, it } from "vitest";

import {
  boardFiltersEqual,
  changeRangeFiltersEqual,
  countActiveViewFilters,
  filterToSliderBounds,
  formatChangeRangeBound,
  formatChangeRangeInput,
  formatChangeRangeSummary,
  isChangeRangeActive,
  matchesChangeRange,
  normalizeChangeRangeFilter,
  normalizeRefreshIntervalSeconds,
  parseChangeRangeInput,
  parseHeatmapBordersQuery,
  parseStoredBoardFilter,
  parseStoredChangeRangeFilter,
  sanitizeBoardFilter,
  snapChangeRangeValue,
  toggleBoardInFilter,
} from "./filters";
import { allBoardsValue, allTrendsValue, emptyChangeRangeFilter } from "./constants";

describe("parseHeatmapBordersQuery", () => {
  it("解析开/关/无值", () => {
    expect(parseHeatmapBordersQuery("on")).toBe(true);
    expect(parseHeatmapBordersQuery("TRUE")).toBe(true);
    expect(parseHeatmapBordersQuery("0")).toBe(false);
    expect(parseHeatmapBordersQuery("off")).toBe(false);
    expect(parseHeatmapBordersQuery("bogus")).toBeNull();
    expect(parseHeatmapBordersQuery(null)).toBeNull();
  });
});

describe("normalizeRefreshIntervalSeconds", () => {
  it("按上下限收敛刷新间隔", () => {
    expect(normalizeRefreshIntervalSeconds(null)).toBe(8);
    expect(normalizeRefreshIntervalSeconds("15")).toBe(15);
    expect(normalizeRefreshIntervalSeconds("1")).toBe(3);
    expect(normalizeRefreshIntervalSeconds("9999")).toBe(600);
    expect(normalizeRefreshIntervalSeconds("abc")).toBe(8);
  });
});

describe("板块筛选", () => {
  it("parseStoredBoardFilter 兼容 JSON 数组、旧版单值与哨兵", () => {
    expect(parseStoredBoardFilter(null)).toEqual([]);
    expect(parseStoredBoardFilter(allBoardsValue)).toEqual([]);
    expect(parseStoredBoardFilter(JSON.stringify(["银行", "电子"]))).toEqual(["银行", "电子"]);
    expect(parseStoredBoardFilter(JSON.stringify("银行"))).toEqual(["银行"]);
    expect(parseStoredBoardFilter("银行")).toEqual(["银行"]);
  });

  it("toggleBoardInFilter 支持添加、移除与首个选中", () => {
    expect(toggleBoardInFilter([], "银行")).toEqual(["银行"]);
    expect(toggleBoardInFilter(["银行", "电子"], "银行")).toEqual(["电子"]);
    expect(toggleBoardInFilter(["电子"], "银行")).toEqual(["电子", "银行"]);
  });

  it("sanitizeBoardFilter 移除不存在的板块", () => {
    expect(sanitizeBoardFilter(["银行", "传媒"], ["银行", "电子"])).toEqual(["银行"]);
  });

  it("boardFiltersEqual 按顺序比较", () => {
    expect(boardFiltersEqual(["a", "b"], ["a", "b"])).toBe(true);
    expect(boardFiltersEqual(["a", "b"], ["b", "a"])).toBe(false);
    expect(boardFiltersEqual(["a"], ["a", "b"])).toBe(false);
  });
});

describe("涨跌区间筛选", () => {
  it("normalizeChangeRangeFilter 交换反转发界", () => {
    expect(normalizeChangeRangeFilter({ min: 5, max: -5 })).toEqual({ min: -5, max: 5 });
    expect(normalizeChangeRangeFilter({ min: -5, max: 5 })).toEqual({ min: -5, max: 5 });
    expect(normalizeChangeRangeFilter({ min: null, max: null })).toEqual({ min: null, max: null });
  });

  it("parseStoredChangeRangeFilter 解析并丢弃非法字段", () => {
    expect(parseStoredChangeRangeFilter(JSON.stringify({ min: -3, max: 5 }))).toEqual({ min: -3, max: 5 });
    expect(parseStoredChangeRangeFilter(JSON.stringify({ min: 5, max: -3 }))).toEqual({ min: -3, max: 5 });
    expect(parseStoredChangeRangeFilter(JSON.stringify({ min: "3", max: 5 }))).toEqual({ min: null, max: 5 });
    expect(parseStoredChangeRangeFilter(JSON.stringify({}))).toEqual(emptyChangeRangeFilter);
    expect(parseStoredChangeRangeFilter("not json")).toEqual(emptyChangeRangeFilter);
    expect(parseStoredChangeRangeFilter(null)).toEqual(emptyChangeRangeFilter);
  });

  it("isChangeRangeActive 与 changeRangeFiltersEqual", () => {
    expect(isChangeRangeActive({ min: null, max: null })).toBe(false);
    expect(isChangeRangeActive({ min: 0, max: null })).toBe(true);
    expect(changeRangeFiltersEqual({ min: 1, max: 2 }, { min: 1, max: 2 })).toBe(true);
    expect(changeRangeFiltersEqual({ min: 1, max: 2 }, { min: 2, max: 1 })).toBe(false);
  });

  it("matchesChangeRange 处理开区间", () => {
    const range = { min: -5, max: 5 };
    expect(matchesChangeRange(0, range)).toBe(true);
    expect(matchesChangeRange(-5, range)).toBe(true);
    expect(matchesChangeRange(5.1, range)).toBe(false);
    expect(matchesChangeRange(-6, range)).toBe(false);
    expect(matchesChangeRange(100, { min: null, max: null })).toBe(true);
  });

  it("formatChangeRangeSummary 与 formatChangeRangeBound", () => {
    expect(formatChangeRangeSummary({ min: -5, max: 5 })).toBe("-5% ~ 5%");
    expect(formatChangeRangeSummary({ min: 5, max: null })).toBe("≥5%");
    expect(formatChangeRangeSummary({ min: null, max: -2 })).toBe("≤-2%");
    expect(formatChangeRangeSummary(emptyChangeRangeFilter)).toBe("");
    expect(formatChangeRangeBound(5)).toBe("+5%");
    expect(formatChangeRangeBound(-5)).toBe("-5%");
    expect(formatChangeRangeBound(0)).toBe("0%");
  });

  it("formatChangeRangeInput 与 parseChangeRangeInput 往返", () => {
    expect(formatChangeRangeInput(null)).toBe("");
    expect(formatChangeRangeInput(3)).toBe("3");
    expect(parseChangeRangeInput("", 7)).toBeNull();
    expect(parseChangeRangeInput(" 3.5 ", 7)).toBe(3.5);
    expect(parseChangeRangeInput("abc", 7)).toBe(7);
  });

  it("snapChangeRangeValue 按步长吸附并夹到滑块范围", () => {
    expect(snapChangeRangeValue(3.4)).toBe(3);
    expect(snapChangeRangeValue(3.6)).toBe(4);
    expect(snapChangeRangeValue(30)).toBe(20);
    expect(snapChangeRangeValue(-30)).toBe(-20);
  });

  it("filterToSliderBounds 将未设界填充为滑块极值", () => {
    expect(filterToSliderBounds(emptyChangeRangeFilter)).toEqual({ min: -20, max: 20 });
    expect(filterToSliderBounds({ min: -3, max: 5 })).toEqual({ min: -3, max: 5 });
    expect(filterToSliderBounds({ min: -3, max: null })).toEqual({ min: -3, max: 20 });
  });

  it("countActiveViewFilters 统计启用的筛选数量", () => {
    expect(countActiveViewFilters([], allTrendsValue, emptyChangeRangeFilter)).toBe(0);
    expect(countActiveViewFilters(["银行"], allTrendsValue, emptyChangeRangeFilter)).toBe(1);
    expect(countActiveViewFilters([], "__rising__", emptyChangeRangeFilter)).toBe(1);
    expect(countActiveViewFilters([], allTrendsValue, { min: null, max: 3 })).toBe(1);
    expect(countActiveViewFilters(["银行"], "__rising__", { min: null, max: 3 })).toBe(3);
  });
});
