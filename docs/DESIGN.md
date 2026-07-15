# Design

## 방향

현대적인 재판 기록물과 한국 밈 편집 디자인을 결합한다. 실제 법원 서비스로 오해되지 않도록 정부 로고, 법원 명칭, 공식 문장, 판사·망치 상징을 쓰지 않는다.

## 토큰

- 바탕: ivory `#f8f4ea`
- 먹색: `#242621`
- 인주색: `#a9362c`, 어두운 상태 `#7e261f`
- 청회색: `#4b6570`
- 선: `#c7bfaf`
- 본문: 한국어 system sans, 판결 제목: Georgia/Batang 계열 serif

도장은 판결의 장식적 강조 한 번에만 쓰며 아이콘을 반복하지 않는다. 그림자와 종이 선은 얕게 유지한다. 보라색 AI gradient, neon, glassmorphism, dashboard, chatbot UI를 금지한다.

## 반응형

- 1440px: 진술과 접수 카드를 2열, 판결과 투표를 2열로 보여준다.
- 768px: 입력은 1열, 판결 보조 행동은 필요한 경우 2열이다.
- 360px: 모든 흐름은 1열이며 가로 스크롤이 없어야 한다.

## 접근성

본문 건너뛰기 링크, 실제 label, semantic heading, `meter` 이름, `aria-live`, 충분한 focus outline을 제공한다. 색만으로 선택을 구분하지 않는다. `prefers-reduced-motion`에서 애니메이션과 smooth scroll을 제거한다.

## 네트워크 상태

모델 방식은 WebGPU/WASM/fallback으로 텍스트 표시한다. 공개 실패는 판결 카드와 분리된 alert로 나타내어 로컬 결과가 사라진 것처럼 보이지 않게 한다.
