import { REQUEST_STATUS, useAppStore } from '../../store/useAppStore'
import './StatusMessage.css'

const STATUS_CONTENT = {
  [REQUEST_STATUS.LOADING]: {
    title: 'Calculating route',
    fallback: 'Waiting for the route service to respond.',
  },
  [REQUEST_STATUS.SUCCESS]: {
    title: 'Route ready',
    fallback: 'The route result was received successfully.',
  },
  [REQUEST_STATUS.NO_PATH]: {
    title: 'No route available',
    fallback: 'No path was returned for the selected request.',
  },
  [REQUEST_STATUS.INVALID_INPUT]: {
    title: 'Invalid route request',
    fallback: 'Check the selected locations and options.',
  },
  [REQUEST_STATUS.ERROR]: {
    title: 'Route service error',
    fallback: 'The route request could not be completed.',
  },
}

export default function StatusMessage({ className = '' }) {
  const graphError = useAppStore((state) => state.graphData.error)
  const graphIsLoading = useAppStore((state) => state.graphData.isLoading)
  const requestState = useAppStore((state) => state.requestState)
  const result = useAppStore((state) => state.routeResult)
  const dismissStatusMessage = useAppStore(
    (state) => state.dismissStatusMessage,
  )

  const status = graphError
    ? REQUEST_STATUS.ERROR
    : graphIsLoading
      ? REQUEST_STATUS.LOADING
      : requestState.status
  if (status === REQUEST_STATUS.IDLE) return null

  const content = graphIsLoading
    ? {
        title: 'Loading graph data',
        fallback: 'Reading locations and road geometries.',
      }
    : STATUS_CONTENT[status] ?? STATUS_CONTENT[REQUEST_STATUS.ERROR]
  const message =
    (graphError && String(graphError)) ||
    (graphIsLoading && content.fallback) ||
    requestState.message ||
    result?.message ||
    content.fallback
  const rootClassName = [
    'status-message',
    `status-message--${status}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={rootClassName}
      role={status === REQUEST_STATUS.ERROR ? 'alert' : 'status'}
      aria-live={status === REQUEST_STATUS.ERROR ? 'assertive' : 'polite'}
    >
      <span className="status-message__icon" aria-hidden="true">
        {status === REQUEST_STATUS.LOADING ? (
          <span className="status-message__spinner" />
        ) : status === REQUEST_STATUS.SUCCESS ? (
          '✓'
        ) : (
          '!'
        )}
      </span>
      <span className="status-message__content">
        <strong>{content.title}</strong>
        <span>{message}</span>
      </span>
      {status !== REQUEST_STATUS.LOADING && !graphError && (
        <button
          type="button"
          onClick={dismissStatusMessage}
          aria-label="Đóng thông báo"
        >
          ×
        </button>
      )}
    </div>
  )
}
