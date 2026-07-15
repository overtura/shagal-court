import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LocalCourt } from "../../src/client/pages/LocalCourt";

describe("local court flow", () => {
  it("judges locally and exposes a separate publish confirmation", async () => {
    window.history.replaceState({}, "", "/?model=off");
    render(<LocalCourt />);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: /사건 진술/ }), "퇴근 직전에 상사가 갑자기 야근을 시켰다.");
    await user.click(screen.getByRole("button", { name: "판결 도장 찍기" }));
    expect(await screen.findByText("이 판결은 밈입니다. 실제 법률 판단이나 법률 조언이 아닙니다.")).toBeVisible();
    expect(screen.getByText(/결정론적 오프라인 대체 방식/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "공개 내용 확인하기" }));
    expect(screen.getByRole("heading", { name: "공개할 한 문장을 다시 확인하세요" })).toBeVisible();
    expect(screen.getByText(/처음 입력한 원문과 로컬 기록은 전송되지 않습니다/)).toBeVisible();
  });
});
