import { useState } from "react";
import type { VoteChoice } from "../../shared/contracts";
import { getPartyVotes, updatePartyVote } from "../storage";

export function LocalPartyVote({ caseId }: { caseId: string }) {
  const [votes, setVotes] = useState(() => getPartyVotes(caseId));
  const vote = (choice: VoteChoice) => setVotes(updatePartyVote(caseId, choice));
  return (
    <section className="party-vote" aria-labelledby="party-title">
      <div><p className="eyebrow">이 브라우저에서만</p><h3 id="party-title">현장 배심원 놀이</h3></div>
      <p>옆 사람과 눌러보는 로컬 집계입니다. 공개 사건의 전역 투표와 절대 합산되지 않습니다.</p>
      <div className="vote-buttons">
        <button type="button" onClick={() => vote("guilty")}>샤갈 맞다 <strong>{votes.guilty}</strong></button>
        <button type="button" onClick={() => vote("not-guilty")}>잠깐, 아니다 <strong>{votes.notGuilty}</strong></button>
      </div>
    </section>
  );
}
