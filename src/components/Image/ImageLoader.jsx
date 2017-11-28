import React, { Component } from 'react'
import { getDownloadLink } from 'cozy-client'

export default class ImageLoader extends Component {
  state = {
    fallback: null
  }

  onLoad = () => {
    if (this.props.onLoad) this.props.onLoad()
  }

  onError = () => {
    if (!this.img) return // if we already unmounted
    if (this.state.fallback !== null) return
    // extreme fallback: uses a direct download link to the raw image
    getDownloadLink(this.props.photo).then(url => {
      this.img.src = url
      this.setState({ fallback: url })
      if (this.props.onLoad) this.props.onLoad()
    })
  }

  componentWillUnmount() {
    // this is needed because when opening 2 times in a row the same photo in the viewer,
    // the second time the onLoad is not fired... This will fire the onError (see above)
    this.img.src = ''
  }

  render() {
    const { photo, src, alt, className, style = {} } = this.props
    return (
      <img
        ref={img => {
          this.img = img
        }}
        className={className}
        onLoad={this.onLoad}
        onError={this.onError}
        style={Object.assign({}, style)}
        alt={alt || photo.name}
        src={src}
      />
    )
  }
}
