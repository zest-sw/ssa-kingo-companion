/**
 * 화면 덩어리를 나눠 받으므로(src/app/lazyScreens.tsx) 처음 여는 화면은 잠깐 뼈대([data-screen-loading])다.
 * 검사는 뼈대가 아니라 실제 화면을 봐야 한다: 본문 칸에 무언가 붙었고 뼈대가 없을 때까지 기다린다.
 * 끝내 화면이 안 오면(덩어리 받기 실패) 그대로 실패로 올린다.
 */
export async function waitForScreen(page, timeout = 10000) {
  await page.waitForFunction(() => {
    const main = document.querySelector('.app-main');
    return !!main && main.childElementCount > 0 && !document.querySelector('[data-screen-loading]');
  }, null, { timeout });
}
