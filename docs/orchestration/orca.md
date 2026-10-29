# Orca CLI 사용법 (Windows PowerShell)

Orca 데스크톱 앱이 켜져 있어야 한다. `orca status --json` 이 `ok: true` 를 주면 연결된 것이다. 이 PC 에서는 `C:\Users\user\AppData\Local\Programs\orca\resources\bin` 이 PATH 에 있다. 안 잡히면 그 경로를 PATH 앞에 붙인다.

## 1. 작업 공간과 워커

```powershell
orca repo list --json
orca worktree list --json
orca worktree create --repo id:<repoId> --name <이름> --json     # 새 브랜치 + 작업 공간
orca worktree rm --worktree name:<이름> --force --json           # 정리 (병합 뒤)
orca terminal list --json
```

모델은 에이전트를 띄우는 **명령의 `--model` 플래그**로 정한다. 프롬프트에 `/model` 을 보내지 않는다(사용자 전역 설정을 덮어쓴다).

```powershell
orca terminal create --worktree path:<작업공간 경로> --title "<이름>" --command "claude --dangerously-skip-permissions --model sonnet" --json
# 20초쯤 지나 화면에 입력 줄이 보이면 지시를 보낸다
orca terminal send --terminal <handle> --text "TASK-<이름>.md 를 읽고 그대로 수행해라." --enter --json
```

- `--enter` 를 빼면 메시지가 입력창에만 남는다. 보낸 뒤 `orca terminal read --terminal <handle> --screen --json` 으로 실제로 도는지 확인한다.
- 긴 지시는 직접 보내지 않는다. 작업 공간 루트에 `TASK-<이름>.md` 를 쓰고 한 줄만 보낸다. 이 파일은 공용 `.git/info/exclude` 의 `/TASK*.md` 로 커밋에서 빠진다.
- 새 터미널은 뜨는 데 20초쯤 걸린다. 바로 보내면 삼켜진다.
- `agent_prompt_blocked` 로 거절되면 `--text "내용"` (엔터 없이) 먼저, 그다음 `--text "" --enter` 로 나눠 보낸다.

## 2. 관찰

```powershell
orca terminal read --terminal <handle> --screen --json                  # 지금 화면 (한글이 안 깨진다)
orca terminal read --terminal <handle> --limit 4000 --json             # 누적 출력
orca terminal wait --terminal <handle> --for tui-idle --timeout-ms 600000 --json
git -C <작업공간> log --oneline -5                                      # 진행은 커밋으로 본다
```

## 3. 화면 확인

```powershell
# dev 서버를 따로 띄워 둔다 (포트는 작업 공간마다 다르게)
orca terminal create --worktree path:<작업공간> --title "dev" --command "npm run dev -- --port 5201" --json
orca tab create --url "http://localhost:5201/" --worktree path:<작업공간> --json
orca screenshot --worktree path:<작업공간> --json         # base64 이미지. 파일로 저장해서 눈으로 본다
orca console --limit 50 --worktree path:<작업공간> --json  # 콘솔 에러
orca snapshot --worktree path:<작업공간> --json            # 접근성 트리, @e1 같은 참조
orca click --element @e3 --worktree path:<작업공간> --json
```

- **폭 확인은 `public/qa-frame.html` 로 한다.** `/qa-frame.html?w=1280` 처럼 열면 같은 오리진 iframe 을 정확한 폭으로 띄운다. `orca set device` 로 에뮬레이션한 화면은 스크린샷이 타일로 중복되는 문제가 있어 쓰지 않는다(2026-09 확인된 결함).
- 숫자로 확정할 수 있는 건 스크린샷 대신 DOM 실측으로 근거를 댄다(`scrollWidth === clientWidth`, `getBoundingClientRect`).
- 탭이 백그라운드면 스크린샷이 타임아웃 난다. `orca tab switch` 로 앞으로 가져온다.
- 대체한 폭으로 봤으면 보고에 그렇게 적는다. "1440에서 확인"이라고 쓰려면 정말 1440 iframe 으로 봐야 한다.

## 4. GitHub

```powershell
gh pr create --base main --head <브랜치> --title "<영역: 무엇>" --body-file <파일>
gh pr checks <번호> --watch
gh run list --limit 5 --json databaseId,status,conclusion,name
gh run view <id> --log-failed
gh pr merge <번호> --squash --delete-branch
```

비공개 저장소(무료 요금제)라 브랜치 보호와 GitHub Pages 는 쓸 수 없다. 대신 CI 가 통과한 PR 만 병합하는 걸 지휘자가 지킨다.
