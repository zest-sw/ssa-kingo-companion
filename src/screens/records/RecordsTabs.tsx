import type { ReactNode } from 'react';
import { TabPanel, Tabs } from '../../components';
import { navigate } from '../../app/router';
import { useApp } from '../../app/AppState';

export type RecordsTab = 'interview' | 'archive';

/** 기록 화면 위쪽 탭. 탭 이동은 하위 경로(#/records/interview, #/records/archive)와 맞춘다. */
export function RecordsTabs({ value, children }: { value: RecordsTab; children: ReactNode }) {
  const { state } = useApp();
  const pending = state.activities.filter(a => a.status === 'ended').length;
  return (
    <>
      <Tabs<RecordsTab>
        id="rec"
        label="기록"
        value={value}
        onChange={id => navigate(`records/${id}`)}
        items={[{ id: 'interview', label: '회고 쓰기', count: pending }, { id: 'archive', label: '기록 보관함' }]}
      />
      <TabPanel id="rec" active={value}>{children}</TabPanel>
    </>
  );
}
