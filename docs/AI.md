# Local AI and Verdict Engine

## 모델

`Xenova/paraphrase-multilingual-MiniLM-L12-v2`를 브라우저 Web Worker 안에서 `@huggingface/transformers`로 로드한다. 우선순위는 WebGPU, WASM, deterministic fallback이다. 모델 파일과 연산은 사용자 브라우저에서 처리되고 서버 AI 호출은 없다.

## 처리

1. 입력을 NFKC와 공백 규칙으로 정규화한다.
2. feature extraction 결과를 mean pooling·normalize하여 embedding으로 사용한다.
3. category keyword와 embedding의 안정적인 projection을 결합해 0~1 축을 만든다.
4. 공유 순수 함수가 unfairness, absurdity, other responsibility, harm, misunderstanding, mitigation, confidence를 점수화한다.
5. confidence가 낮으면 `insufficient`, 그 외 score threshold로 판결한다.

fallback은 모델 출력 없이 같은 텍스트에 항상 같은 결과를 낸다. 브라우저가 오프라인이면 즉시 fallback하고, 온라인 최초 모델 다운로드·초기화에는 최대 45초를 허용한다. timeout이나 로컬 실행 오류가 나도 판결 흐름은 실패하지 않는다.

## 서버 신뢰 경계

클라이언트는 분석값을 보내지만 판결 문구나 점수를 저장 요청의 권위로 보내지 않는다. Worker는 category와 모든 축이 유효 범위인지 검사하고 동일한 `calculateVerdict()`로 code, score, reasons, disclaimer를 다시 계산한다.

## 안전

엔진 템플릿에는 법률·의료 판단이 없다. 출력에 실제 법 조항, 형량, 벌금, 고소 가능성, 범죄 성립, 범죄자 단정, 신상 공개, 보복, 혐오·차별을 추가하지 않는다. 모델 교체는 protected change이며 자동 병합하지 않는다.
