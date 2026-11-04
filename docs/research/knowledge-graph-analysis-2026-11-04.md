# 지식 그래프 생성·분석 조사 (2026-11-04)

> 사용자 요청: "활동들을 모두 공간에 넣고, LLM과 룰 베이스로 엣지를 그려 지식 그래프를 형성하면 가까이 있는 것들이 모인다. 가까이 있는 것들 중 사전에 정한 키워드와 매칭되는 것이 있으면 영역으로 클러스터를 표현. 지식 그래프 생성과 분석은 따로 분리. 키워드로 클러스터링할까, LLM에게 동적으로 묶고 이름을 만들게 할까. 클러스터링·지식 그래프 분석 기법을 공부해서 서비스에 반영."

## 결론: 우리 서비스에 쓰는 방식
1. **생성과 분석을 나눈다.** Microsoft GraphRAG 도 '텍스트에서 지식 그래프 추출 → Leiden 계층 군집 → 군집(커뮤니티) 요약' 단계를 나눈다. 우리는 `domain/kg/build`(그래프 만들기)와 `domain/kg/analyze`(그래프 읽기)를 분리한다. 만들기는 데이터가 바뀔 때만, 읽기는 화면이 필요할 때 다시 계산한다.
2. **엣지는 규칙 + LLM, 출처를 남긴다.** 규칙 엣지: 같은 분야, 같은 확인 역량, 다음 학기 같은 줄기(이어짐), 같은 주최·시리즈, 공유 키워드. LLM 엣지: 회고 문장 사이의 의미 관계(예: '여기서 배운 질문법을 저 활동에서 썼다'). 모든 엣지에 {종류, 무게, 출처: 규칙|LLM|학생, 신뢰도, 이유}를 붙이고 LLM 엣지는 학생이 확인하기 전까지 점선. 근거: LLM 은 소수 예시 추출기보다 추론 보조로 더 잘 맞고(Zhu 외 2024), LLM 추출은 환각 트리플 위험이 있어(KG 구축 조사 2025) 출처 표시와 확인이 필요하다.
3. **묶음(클러스터)은 그래프 구조로 정한다 — Leiden.** Louvain 은 약하게 연결되거나 끊긴 커뮤니티를 만들 수 있다(실험에서 최대 25% 약한 연결, 16% 끊김). Leiden 은 커뮤니티의 연결을 보장하고 더 빠르다(Traag 외 2019). 우리 그래프(노드 수십 개)는 'Louvain 지역 이동 + 끊긴 커뮤니티 쪼개기(Leiden 의 연결 보장)'를 결정적으로(같은 입력이면 같은 결과) 구현한다.
4. **이름은 '사전 키워드 우선, 없으면 LLM 제안, 학생이 확인'(하이브리드).**
   - 묶음 안 활동 글(제목·한 일·회고)에서 c-TF-IDF 로 대표 단어를 뽑고(BERTopic 방식), 미리 정한 우리 키워드 사전(활동 주제 분류)과 맞추어 정규화한다(EDC 의 Canonicalize: 미리 정한 스키마가 있으면 그것에 맞춘다).
   - 사전과 맞으면 그 이름(안정적·설명 가능: '인터뷰·설문이 맞아서').
   - 맞는 게 없으면 LLM 이 이름 후보와 한 줄 요약을 만든다(BERTopic 의 LLM 표현, GraphRAG 커뮤니티 보고서). 'AI 제안 이름'으로 점선 표시, 학생이 맞아요/고칠래요.
   - 왜 하이브리드인가: (a) 안정성 — 동적 LLM 이름은 계산할 때마다 바뀌어 학기 사이 비교가 깨진다, (b) 설명 가능 — 어떤 키워드가 맞았는지 보여 줄 수 있다, (c) 추천과 같은 태그 체계 — 기준 문서: '기회 DB와 학생 분석은 같은 태그 체계를 쓴다', (d) 비용·개인정보, (e) 새 조합을 부르는 데는 LLM 이 낫다 → 사전 밖일 때만. GraphRAG 분석 연구(TACL 2026)도 LLM 요약과 고정 템플릿 보고서를 비교한다 — 우리는 사실 부분은 템플릿, 해석 한 줄만 LLM.
5. **그래프 분석 기법 → 학생에게 주는 깨달음**
   | 기법 | 계산 | 화면에서 |
   |---|---|---|
   | 커뮤니티 탐지(Leiden) | 묶음 | '사용자 리서치 묶음 5개' 영역 |
   | 연결 중심성·PageRank | 가장 많이 이어진 활동 | '중심 활동: 리서치 스터디 — 다른 활동 4개로 이어졌어요' |
   | 매개 중심성(Brandes) | 묶음 사이를 잇는 활동 | '연결고리: 학생 식당 앱 설문이 리서치와 데이터 분석을 이어요' |
   | 링크 예측(공통 이웃·Adamic-Adar) | 아직 없는 연결 중 생길 법한 것 | '이어질 수 있는 활동: ○○ 워크숍 — 리서치 묶음과 역량 2개를 나눠요'(추천 근거) |
   | 고립·약한 노드 | 이어진 데가 없는 활동 | '아직 이어지지 않은 활동 — 회고로 연결을 찾아볼까요' |
   | 시간 흐름 | 묶음이 언제 생기고 자랐나 | '2025-2부터 자란 묶음' |
6. **프로토타입에서는** 실제 LLM 이 없으므로 LLM 엣지·이름 후보를 예시 데이터에 미리 넣고(출처 'LLM', 이유 문장 포함), 같은 인터페이스(LlmProvider)로 나중에 실제 모델을 꽂을 수 있게 한다.

## 출처
- Traag, Waltman, van Eck (2019). From Louvain to Leiden: guaranteeing well-connected communities. Scientific Reports 9:5233. https://doi.org/10.1038/s41598-019-41695-z · leidenalg 문서 https://leidenalg.readthedocs.io/en/stable/intro.html
- Blondel 외 (2008). Fast unfolding of communities in large networks (Louvain). J. Stat. Mech. P10008. https://doi.org/10.1088/1742-5468/2008/10/P10008
- Microsoft GraphRAG 문서 https://microsoft.github.io/graphrag · Edge 외 (2024) From Local to Global: A Graph RAG Approach, arXiv:2404.16130 · GraphRAG 패턴 https://graphrag.com/reference/graphrag/global-community-summary-retriever/
- Dissecting GraphRAG: A Modular Analysis of Knowledge Structuring (TACL 2026) https://aclanthology.org/2026.tacl-1.29.pdf
- Grootendorst (2022). BERTopic, arXiv:2203.05794 · 문서 https://bertopic.readthedocs.io
- Zhang, Soh (2024). Extract, Define, Canonicalize: An LLM-based Framework for KG Construction. EMNLP 2024. https://aclanthology.org/2024.emnlp-main.548
- Zhu 외 (2024). LLMs for knowledge graph construction and reasoning. World Wide Web 27:58. https://doi.org/10.1007/s11280-024-01297-w
- Knowledge Graph Construction: Extraction, Learning, and Evaluation (2025). Applied Sciences 15(7):3727. https://www.mdpi.com/2076-3417/15/7/3727 · LLM-empowered KG construction: A survey (2025) arXiv:2510.20345
- LLMs Between the Nodes: Community Discovery Beyond Vectors (2025) arXiv:2507.22955
- Liben-Nowell, Kleinberg (2007). The link-prediction problem for social networks. JASIST 58(7). https://doi.org/10.1002/asi.20591 · Adamic, Adar (2003). Friends and neighbors on the Web. Social Networks 25(3). https://doi.org/10.1016/S0378-8733(03)00009-1
- Brandes (2001). A faster algorithm for betweenness centrality. J. Math. Sociology 25(2). https://doi.org/10.1080/0022250X.2001.9990249
