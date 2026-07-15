import { LocalCourt } from "./pages/LocalCourt";
import { SharedCase } from "./pages/SharedCase";

function currentSharedSlug(): string | null {
  const match = window.location.pathname.match(/^\/case\/([a-z0-9_-]+)\/?$/i);
  return match?.[1] ?? null;
}

export default function App() {
  const slug = currentSharedSlug();
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="샤갈 재판소 홈"><span aria-hidden="true">샤</span><strong>샤갈 재판소</strong><small>밈 판결소</small></a>
        <nav aria-label="주요 안내"><a href="/#privacy">개인정보 원칙</a><a href="https://github.com/overtura/shagal-court">GitHub</a></nav>
      </header>
      {slug ? <SharedCase slug={slug} /> : <LocalCourt />}
      <footer className="site-footer" id="privacy">
        <div><strong>샤갈 재판소</strong><p>법률 서비스가 아닌 한국어 밈 판결 실험입니다.</p></div>
        <div><p>원문은 로컬 · 공개는 명시적 동의 · 익명 기기 식별 · 90일 자동 만료</p><p>© {new Date().getFullYear()} Overtura</p></div>
      </footer>
    </div>
  );
}
