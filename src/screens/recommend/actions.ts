import type { Program } from '../../domain/types';

export type CardActions = { onPrepare: (p: Program) => void; onLater: (p: Program) => void; onDismiss: (p: Program) => void };
