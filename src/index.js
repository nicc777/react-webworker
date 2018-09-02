import React from "react"

const getInitialState = () => ({
  messages: [],
  errors: [],
  data: undefined,
  error: undefined,
  updatedAt: undefined
})

const uninitialized = () => {
  throw new Error("Not initialized")
}

const { Consumer, Provider } = React.createContext(getInitialState())

class WebWorker extends React.Component {
  state = getInitialState()

  onMessage = ({ data }) => {
    if (!this.mounted) return
    const date = new Date()
    this.setState(
      state => ({ data, error: undefined, messages: state.messages.concat({ data, date }), updatedAt: date }),
      () => this.props.onMessage && this.props.onMessage(data)
    )
  }

  onError = ({ error }) => {
    if (!this.mounted) return
    const date = new Date()
    this.setState(
      state => ({ error, errors: state.errors.concat({ error, date }), updatedAt: date }),
      () => this.props.onError && this.props.onError(error)
    )
  }

  componentDidMount() {
    this.worker = new window.Worker(this.props.path)
    this.worker.onmessage = this.onMessage
    this.worker.onerror = this.onError
    this.mounted = true
    this.setState(getInitialState())
  }

  componentWillUnmount() {
    this.mounted = false
    this.worker.terminate()
  }

  render() {
    const { children } = this.props
    const { postMessage = uninitialized } = this.worker || {}
    const renderProps = {
      ...this.state,
      postMessage: (...args) => postMessage.call(this.worker, ...args)
    }

    if (typeof children === "function") {
      return <Provider value={renderProps}>{children(renderProps)}</Provider>
    }

    if (children !== undefined && children !== null) {
      return <Provider value={renderProps}>{children}</Provider>
    }

    return null
  }
}

/**
 * Renders only when no message or error has been received yet
 *
 * @prop {boolean} persist Show until we have data, even when an error occurred
 * @prop {Function|Node} children Function (passing props) or React node
 */
WebWorker.Pending = ({ children, persist }) => (
  <Consumer>
    {props => {
      if (props.data !== undefined) return null
      if (!persist && props.error !== undefined) return null
      return typeof children === "function" ? children(props) : children || null
    }}
  </Consumer>
)

/**
 * Renders only when worker has sent a message with data
 *
 * @prop {Function|Node} children Function (passing data and props) or React node
 */
WebWorker.Data = ({ children }) => (
  <Consumer>
    {props => {
      if (props.data === undefined) return null
      return typeof children === "function" ? children(props.data, props) : children || null
    }}
  </Consumer>
)

/**
 * Renders only when worker has sent an error
 *
 * @prop {Function|Node} children Function (passing error and props) or React node
 */
WebWorker.Error = ({ children }) => (
  <Consumer>
    {props => {
      if (props.error === undefined) return null
      return typeof children === "function" ? children(props.error, props) : children || null
    }}
  </Consumer>
)

export default WebWorker
