/**
 * Límite de error.
 *
 * El tablero se presenta en vivo ante un jurado. Que un archivo de datos falte o venga
 * incompleto puede degradar una sección, pero nunca debe dejar la página en blanco.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { L } from '../settings';

interface Props { children: ReactNode; nombre: string }
interface State { error: Error | null }

export class LimiteError extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.nombre}]`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="aviso" role="status">
        <h3>{L(`${this.props.nombre} no se pudo mostrar`, `${this.props.nombre} could not be shown`)}</h3>
        <p>
          {L('El resto de la página sigue funcionando. Detalle:', 'The rest of the page still works. Detail:')}{' '}
          <code>{this.state.error.message}</code>
        </p>
      </div>
    );
  }
}
