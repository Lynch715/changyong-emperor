import {DILEMMA_RULES} from './dilemma-content.js';
// S01 scheduling projection; only existing narrative is enabled in S02.
export const WEEK_EVENT_RULES={
  "M01": {
    "window": {
      "recommended": [
        1,
        1,
        2
      ],
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        1,
        1,
        2
      ],
      "latest": [
        1,
        3,
        30
      ]
    },
    "slotCost": 0,
    "costGroup": "SC-M01",
    "requires": [],
    "actor": "C02",
    "period": "day"
  },
  "M02": {
    "window": {
      "recommended": [
        1,
        1,
        7
      ],
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        1,
        1,
        7
      ],
      "latest": [
        1,
        3,
        30
      ]
    },
    "slotCost": 0,
    "costGroup": "SC-M02",
    "requires": [],
    "actor": "C02",
    "period": "evening"
  },
  "M03": {
    "window": {
      "recommended": [
        1,
        4,
        2
      ],
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        1,
        4,
        2
      ],
      "latest": [
        1,
        6,
        30
      ]
    },
    "slotCost": 0,
    "costGroup": "SC-M03",
    "requires": [],
    "actor": "C07",
    "period": "day"
  },
  "M04": {
    "window": {
      "recommended": [
        1,
        4,
        7
      ],
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        1,
        4,
        7
      ],
      "latest": [
        1,
        6,
        30
      ]
    },
    "slotCost": 0,
    "costGroup": "SC-M04",
    "requires": [],
    "actor": "C28",
    "period": "day"
  },
  "M05": {
    "window": {
      "recommended": [
        1,
        7,
        2
      ],
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        1,
        7,
        2
      ],
      "latest": [
        1,
        9,
        30
      ]
    },
    "slotCost": 0,
    "costGroup": "SC-M05",
    "requires": [],
    "actor": "C06",
    "period": "day"
  },
  "M06": {
    "window": {
      "recommended": [
        1,
        10,
        2
      ],
      "firstUnlock": "M06",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        1,
        10,
        2
      ],
      "latest": [
        1,
        12,
        30
      ]
    },
    "slotCost": 0,
    "costGroup": "SC-M06",
    "requires": [],
    "actor": "C08",
    "period": "day"
  },
  "M07": {
    "window": {
      "recommended": [
        2,
        1,
        2
      ],
      "firstUnlock": "M06",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        2,
        1,
        2
      ],
      "latest": [
        2,
        3,
        30
      ]
    },
    "slotCost": 0,
    "costGroup": "SC-M07",
    "requires": [],
    "actor": "C08",
    "period": "day"
  },
  "M08": {
    "window": {
      "recommended": [
        2,
        1,
        7
      ],
      "firstUnlock": "M08",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        2,
        1,
        7
      ],
      "latest": [
        2,
        3,
        30
      ]
    },
    "slotCost": 0,
    "costGroup": "SC-M08",
    "requires": [],
    "actor": "C04",
    "period": "day"
  },
  "M09": {
    "window": {
      "recommended": [
        2,
        4,
        2
      ],
      "firstUnlock": "M09",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        2,
        4,
        2
      ],
      "latest": [
        2,
        6,
        30
      ]
    },
    "slotCost": 0,
    "costGroup": "SC-M09",
    "requires": [],
    "actor": "C05",
    "period": "day"
  },
  "M10": {
    "window": {
      "recommended": [
        2,
        4,
        7
      ],
      "firstUnlock": "M10",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        2,
        4,
        7
      ],
      "latest": [
        2,
        6,
        30
      ]
    },
    "slotCost": 0,
    "costGroup": "SC-M10",
    "requires": [],
    "actor": "C03",
    "period": "day"
  },
  "M11": {
    "window": {
      "recommended": [
        2,
        7,
        2
      ],
      "firstUnlock": "M06",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        2,
        7,
        2
      ],
      "latest": [
        2,
        9,
        30
      ]
    },
    "slotCost": 0,
    "costGroup": "SC-M11",
    "requires": [],
    "actor": "C09",
    "period": "day"
  },
  "M12": {
    "window": {
      "recommended": [
        2,
        10,
        2
      ],
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        2,
        10,
        2
      ],
      "latest": [
        2,
        12,
        30
      ]
    },
    "slotCost": 0,
    "costGroup": "SC-M12",
    "requires": [],
    "actor": "C06",
    "period": "day"
  },
  "R02-01": {
    "window": {
      "recommended": [
        1,
        1,
        7
      ],
      "firstUnlock": "M01",
      "last": "首版可跨季补谈至二年末；遵守真实出行和六格，不自动处理。",
      "earliest": [
        1,
        1,
        2
      ],
      "latest": [
        2,
        12,
        29
      ],
      "sameDateAs": "M02"
    },
    "slotCost": 0,
    "costGroup": "SC-M02",
    "requires": [
      "M02"
    ],
    "actor": "C02",
    "period": "evening"
  },
  "R02-02": {
    "window": {
      "recommended": [
        1,
        1,
        8
      ],
      "firstUnlock": "M01",
      "last": "首版可跨季补谈至二年末；遵守真实出行和六格，不自动处理。",
      "earliest": [
        1,
        1,
        2
      ],
      "latest": [
        2,
        12,
        29
      ]
    },
    "slotCost": 1,
    "costGroup": "SC-R02-02",
    "requires": [
      "R02-01"
    ],
    "actor": "C02",
    "minimumDaysAfterPrevious": 1,
    "period": "evening"
  },
  "R03-01": {
    "window": {
      "recommended": [
        2,
        4,
        7
      ],
      "firstUnlock": "M10",
      "last": "首版可跨季补谈至二年末；遵守真实出行和六格，不自动处理。",
      "earliest": [
        2,
        4,
        2
      ],
      "latest": [
        2,
        12,
        29
      ],
      "sameDateAs": "M10"
    },
    "slotCost": 0,
    "costGroup": "SC-M10",
    "requires": [
      "M10"
    ],
    "actor": "C03",
    "period": "day"
  },
  "R03-02": {
    "window": {
      "recommended": [
        2,
        7,
        4
      ],
      "firstUnlock": "M10",
      "last": "首版可跨季补谈至二年末；遵守真实出行和六格，不自动处理。",
      "earliest": [
        2,
        5,
        7
      ],
      "latest": [
        2,
        12,
        29
      ]
    },
    "slotCost": 1,
    "costGroup": "SC-R03-02",
    "requires": [
      "R03-01"
    ],
    "actor": "C03",
    "minimumDaysAfterPrevious": 7,
    "period": "day"
  },
  "R04-01": {
    "window": {
      "recommended": [
        2,
        1,
        7
      ],
      "firstUnlock": "M08",
      "last": "首版可跨季补谈至二年末；遵守真实出行和六格，不自动处理。",
      "earliest": [
        2,
        1,
        2
      ],
      "latest": [
        2,
        12,
        29
      ],
      "sameDateAs": "M08"
    },
    "slotCost": 0,
    "costGroup": "SC-M08",
    "requires": [
      "M08"
    ],
    "actor": "C04",
    "period": "day"
  },
  "R04-02": {
    "window": {
      "recommended": [
        2,
        1,
        8
      ],
      "firstUnlock": "M08",
      "last": "首版可跨季补谈至二年末；遵守真实出行和六格，不自动处理。",
      "earliest": [
        2,
        1,
        2
      ],
      "latest": [
        2,
        12,
        29
      ]
    },
    "slotCost": 1,
    "costGroup": "SC-R04-02",
    "requires": [
      "R04-01"
    ],
    "actor": "C04",
    "minimumDaysAfterPrevious": 1,
    "period": "day"
  },
  "R05-01": {
    "window": {
      "recommended": [
        2,
        4,
        2
      ],
      "firstUnlock": "M09",
      "last": "首版可跨季补谈至二年末；遵守真实出行和六格，不自动处理。",
      "earliest": [
        2,
        4,
        2
      ],
      "latest": [
        2,
        12,
        29
      ],
      "sameDateAs": "M09"
    },
    "slotCost": 0,
    "costGroup": "SC-M09",
    "requires": [
      "M09"
    ],
    "actor": "C05",
    "period": "day"
  },
  "R05-02": {
    "window": {
      "recommended": [
        2,
        4,
        4
      ],
      "firstUnlock": "M09",
      "last": "首版可跨季补谈至二年末；遵守真实出行和六格，不自动处理。",
      "earliest": [
        2,
        4,
        2
      ],
      "latest": [
        2,
        12,
        29
      ]
    },
    "slotCost": 1,
    "costGroup": "SC-R05-02",
    "requires": [
      "R05-01"
    ],
    "actor": "C05",
    "minimumDaysAfterPrevious": 1,
    "period": "day"
  },
  "R06-01": {
    "window": {
      "recommended": [
        1,
        7,
        2
      ],
      "firstUnlock": "M01",
      "last": "首版可跨季补谈至二年末；遵守真实出行和六格，不自动处理。",
      "earliest": [
        1,
        7,
        2
      ],
      "latest": [
        2,
        12,
        29
      ],
      "sameDateAs": "M05"
    },
    "slotCost": 0,
    "costGroup": "SC-M05",
    "requires": [
      "M05"
    ],
    "actor": "C06",
    "period": "day"
  },
  "R06-02": {
    "window": {
      "recommended": [
        1,
        7,
        5
      ],
      "firstUnlock": "M01",
      "last": "首版可跨季补谈至二年末；遵守真实出行和六格，不自动处理。",
      "earliest": [
        1,
        7,
        2
      ],
      "latest": [
        2,
        12,
        29
      ]
    },
    "slotCost": 1,
    "costGroup": "SC-R06-02",
    "requires": [
      "R06-01"
    ],
    "actor": "C06",
    "minimumDaysAfterPrevious": 1,
    "period": "evening"
  },
  "R07-01": {
    "window": {
      "recommended": [
        1,
        4,
        2
      ],
      "firstUnlock": "M01",
      "last": "首版可跨季补谈至二年末；遵守真实出行和六格，不自动处理。",
      "earliest": [
        1,
        4,
        2
      ],
      "latest": [
        2,
        12,
        29
      ],
      "sameDateAs": "M03"
    },
    "slotCost": 0,
    "costGroup": "SC-M03",
    "requires": [
      "M03"
    ],
    "actor": "C07",
    "period": "day"
  },
  "R07-02": {
    "window": {
      "recommended": [
        1,
        4,
        5
      ],
      "firstUnlock": "M01",
      "last": "首版可跨季补谈至二年末；遵守真实出行和六格，不自动处理。",
      "earliest": [
        1,
        4,
        2
      ],
      "latest": [
        2,
        12,
        29
      ]
    },
    "slotCost": 1,
    "costGroup": "SC-R07-02",
    "requires": [
      "R07-01"
    ],
    "actor": "C07",
    "minimumDaysAfterPrevious": 1,
    "period": "day"
  },
  "R08-01": {
    "window": {
      "recommended": [
        2,
        1,
        2
      ],
      "firstUnlock": "M06",
      "last": "首版可跨季补谈至二年末；遵守真实出行和六格，不自动处理。",
      "earliest": [
        2,
        1,
        2
      ],
      "latest": [
        2,
        12,
        29
      ],
      "sameDateAs": "M07"
    },
    "slotCost": 0,
    "costGroup": "SC-M07",
    "requires": [
      "M07"
    ],
    "actor": "C08",
    "period": "day"
  },
  "R08-02": {
    "window": {
      "recommended": [
        2,
        1,
        3
      ],
      "firstUnlock": "M06",
      "last": "首版可跨季补谈至二年末；遵守真实出行和六格，不自动处理。",
      "earliest": [
        2,
        1,
        2
      ],
      "latest": [
        2,
        12,
        29
      ]
    },
    "slotCost": 1,
    "costGroup": "SC-R08-02",
    "requires": [
      "R08-01"
    ],
    "actor": "C08",
    "minimumDaysAfterPrevious": 1,
    "period": "evening"
  },
  "G01": {
    "window": {
      "recommended": [
        1,
        4,
        7
      ],
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        1,
        4,
        2
      ],
      "latest": [
        1,
        6,
        30
      ],
      "sameDateAs": "M04"
    },
    "slotCost": 0,
    "costGroup": "SC-M04",
    "requires": [
      "M04"
    ],
    "actor": "C28",
    "period": "day"
  },
  "G02": {
    "window": {
      "recommended": [
        1,
        4,
        8
      ],
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        1,
        4,
        2
      ],
      "latest": [
        1,
        6,
        30
      ]
    },
    "slotCost": 1,
    "costGroup": "SC-G02",
    "requires": [
      "G01"
    ],
    "actor": "C28",
    "period": "day"
  },
  "G03": {
    "window": {
      "recommended": [
        1,
        4,
        15
      ],
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": null,
      "latest": [
        2,
        12,
        30
      ]
    },
    "slotCost": 0,
    "costGroup": "SC-G03",
    "requires": [
      "G02"
    ],
    "actor": "C28",
    "relativeToExecution": {
      "eventId": "G02",
      "minimumDays": 7
    },
    "period": "day"
  },
  "G04": {
    "window": {
      "recommended": [
        2,
        4,
        7
      ],
      "firstUnlock": "M10",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        2,
        4,
        2
      ],
      "latest": [
        2,
        6,
        30
      ],
      "sameDateAs": "M10"
    },
    "slotCost": 0,
    "costGroup": "SC-M10",
    "requires": [
      "R03-01",
      "M10"
    ],
    "actor": "C03",
    "period": "day"
  },
  "G05": {
    "window": {
      "recommended": [
        2,
        4,
        8
      ],
      "firstUnlock": "M10",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        2,
        4,
        2
      ],
      "latest": [
        2,
        6,
        30
      ]
    },
    "slotCost": 1,
    "costGroup": "SC-G05",
    "requires": [
      "G04"
    ],
    "actor": "C03",
    "period": "day"
  },
  "G06": {
    "window": {
      "recommended": [
        2,
        4,
        29
      ],
      "firstUnlock": "M10",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": null,
      "latest": [
        2,
        12,
        30
      ]
    },
    "slotCost": 0,
    "costGroup": "SC-G06",
    "requires": [
      "G05"
    ],
    "actor": "C28",
    "relativeToExecution": {
      "eventId": "G05",
      "minimumDays": 21
    },
    "period": "day"
  },
  "P01": {
    "window": {
      "recommended": [
        1,
        7,
        3
      ],
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        1,
        7,
        2
      ],
      "latest": [
        1,
        9,
        30
      ]
    },
    "slotCost": 1,
    "costGroup": "SC-P01",
    "requires": [],
    "actor": "C11",
    "period": "day"
  },
  "P09": {
    "window": {
      "recommended": [
        1,
        10,
        4
      ],
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        1,
        10,
        2
      ],
      "latest": [
        1,
        12,
        30
      ]
    },
    "slotCost": 1,
    "costGroup": "SC-P09",
    "requires": [],
    "actor": "C19",
    "period": "day"
  },
  "P10": {
    "window": {
      "recommended": [
        2,
        7,
        5
      ],
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        2,
        7,
        2
      ],
      "latest": [
        2,
        9,
        30
      ]
    },
    "slotCost": 1,
    "costGroup": "SC-P10",
    "requires": [],
    "actor": "C20",
    "period": "day"
  },
  "P11": {
    "window": {
      "recommended": [
        2,
        10,
        3
      ],
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "earliest": [
        2,
        10,
        2
      ],
      "latest": [
        2,
        12,
        30
      ]
    },
    "slotCost": 1,
    "costGroup": "SC-P11",
    "requires": [],
    "actor": "C22",
    "period": "day"
  },
  "D01": {
    "window": {
      "recommended": null,
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "season": "春"
    },
    "slotCost": 1,
    "costGroup": "SC-D01",
    "requires": [],
    "actor": "C02"
  },
  "D02": {
    "window": {
      "recommended": null,
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "season": "春"
    },
    "slotCost": 1,
    "costGroup": "SC-D02",
    "requires": [],
    "actor": "C02"
  },
  "D03": {
    "window": {
      "recommended": null,
      "firstUnlock": "M08",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "season": "夏"
    },
    "slotCost": 1,
    "costGroup": "SC-D03",
    "requires": [
      "M08"
    ],
    "actor": "C04"
  },
  "D04": {
    "window": {
      "recommended": null,
      "firstUnlock": "M09",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "season": "夏"
    },
    "slotCost": 1,
    "costGroup": "SC-D04",
    "requires": [
      "M09"
    ],
    "actor": "C05"
  },
  "D05": {
    "window": {
      "recommended": null,
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "season": "秋"
    },
    "slotCost": 1,
    "costGroup": "SC-D05",
    "requires": [],
    "actor": "C02"
  },
  "D06": {
    "window": {
      "recommended": null,
      "firstUnlock": "M10",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "season": "秋"
    },
    "slotCost": 1,
    "costGroup": "SC-D06",
    "requires": [
      "M10"
    ],
    "actor": "C03"
  },
  "D07": {
    "window": {
      "recommended": null,
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "season": "冬"
    },
    "slotCost": 1,
    "costGroup": "SC-D07",
    "requires": [],
    "actor": "C02"
  },
  "D08": {
    "window": {
      "recommended": null,
      "firstUnlock": "M01",
      "last": "所在季度可延后至延展周或明确补谈；硬工期按日期，不静默顺延",
      "season": "冬"
    },
    "slotCost": 1,
    "costGroup": "SC-D08",
    "requires": [],
    "actor": "C02"
  }
};
export const FOCUS_WEEKS=[
  {
    "id": "W01",
    "start": [
      1,
      1,
      2
    ],
    "end": [
      1,
      1,
      8
    ],
    "slots": 6
  },
  {
    "id": "W02",
    "start": [
      1,
      4,
      2
    ],
    "end": [
      1,
      4,
      8
    ],
    "slots": 6
  },
  {
    "id": "W03",
    "start": [
      1,
      7,
      2
    ],
    "end": [
      1,
      7,
      8
    ],
    "slots": 6
  },
  {
    "id": "W04",
    "start": [
      1,
      10,
      2
    ],
    "end": [
      1,
      10,
      8
    ],
    "slots": 6
  },
  {
    "id": "W05",
    "start": [
      2,
      1,
      2
    ],
    "end": [
      2,
      1,
      8
    ],
    "slots": 6
  },
  {
    "id": "W06",
    "start": [
      2,
      4,
      2
    ],
    "end": [
      2,
      4,
      8
    ],
    "slots": 6
  },
  {
    "id": "W07",
    "start": [
      2,
      7,
      2
    ],
    "end": [
      2,
      7,
      8
    ],
    "slots": 6
  },
  {
    "id": "W08",
    "start": [
      2,
      10,
      2
    ],
    "end": [
      2,
      10,
      8
    ],
    "slots": 6
  }
];

Object.assign(WEEK_EVENT_RULES,DILEMMA_RULES);
