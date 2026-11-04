import { registerEntityView, type EntityView } from '../../app/entity';
import { OppModal } from './OppModal';
import { useTriage } from './useTriage';

/** 다른 화면(테크 트리·강점·일정)에서 기회를 열면 서랍 대신 추천과 같은 가운데 모달이 그 자리에서 열린다. */
const OppEntity: EntityView = ({ id, onClose }) => {
  const { actions, dialogs, busy } = useTriage(onClose);
  return (
    <>
      {!busy && <OppModal programId={id} actions={actions} onClose={onClose} />}
      {dialogs}
    </>
  );
};

registerEntityView('opportunity', OppEntity);
