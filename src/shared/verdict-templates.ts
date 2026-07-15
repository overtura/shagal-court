import type { MemeVerdict } from "./contracts";

export const VERDICT_TEMPLATES: Record<MemeVerdict, { title: string; summary: string }> = {
  "shagal-guilty": {
    title: "샤갈 유죄",
    summary: "배심원석에서 탄식이 나왔습니다. 상대방의 황당 지분이 충분합니다.",
  },
  mitigated: {
    title: "정상참작",
    summary: "황당하긴 하지만 사정이 조금 보입니다. 도장은 반만 찍겠습니다.",
  },
  insufficient: {
    title: "심리 보류",
    summary: "한 줄 기록만으로는 확신이 부족합니다. 더 분명한 정황이 필요합니다.",
  },
  "shagal-not-guilty": {
    title: "샤갈 무죄",
    summary: "이번 건은 오해 가능성이 더 큽니다. 잠시 숨을 고르는 편이 낫겠습니다.",
  },
};
