/* global cozy */
// eslint-disable-next-line no-unused-vars
import mainStyles from 'drive/styles/main.styl'

import 'whatwg-fetch'
import React from 'react'
import { render } from 'react-dom'
import { Router, hashHistory } from 'react-router'
import { I18n, initTranslation } from 'cozy-ui/transpiled/react/I18n'
import CozyClient, { CozyProvider } from 'cozy-client'
import {
  shouldEnableTracking,
  getTracker
} from 'cozy-ui/transpiled/react/helpers/tracker'
import { configureReporter, setCozyUrl } from 'drive/lib/reporter'
import StyledApp from 'drive/web/modules/drive/StyledApp'

import appMetadata from 'drive/appMetadata'
import AppRoute from 'drive/web/modules/navigation/AppRoute'
import configureStore from 'drive/store/configureStore'
import { schema } from 'drive/lib/doctypes'
import { hot } from 'react-hot-loader'
import { Document } from 'cozy-doctypes'

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[role=application]')
  const data = root.dataset

  const protocol = window.location ? window.location.protocol : 'https:'
  const cozyUrl = `${protocol}//${data.cozyDomain}`

  configureReporter()
  setCozyUrl(cozyUrl)
  const client = new CozyClient({
    uri: cozyUrl,
    token: data.cozyToken,
    appMetadata,
    schema
  })

  if (!Document.cozyClient) {
    Document.registerClient(client)
  }
  const polyglot = initTranslation(data.cozyLocale, lang =>
    require(`drive/locales/${lang}`)
  )
  configureStore(client, polyglot.t.bind(polyglot))

  cozy.client.init({
    cozyURL: cozyUrl,
    token: data.cozyToken
  })

  cozy.bar.init({
    appName: data.cozyAppName,
    appEditor: data.cozyAppEditor,
    cozyClient: client,
    iconPath: data.cozyIconPath,
    lang: data.cozyLocale,
    replaceTitleOnMobile: false
  })

  let history = hashHistory
  if (shouldEnableTracking() && getTracker()) {
    let trackerInstance = getTracker()
    history = trackerInstance.connectToHistory(hashHistory)
    trackerInstance.track(hashHistory.getCurrentLocation()) // when using a hash history, the initial visit is not tracked by piwik react router
  }

  render(
    <HotedApp
      lang={data.cozyLocale}
      polyglot={polyglot}
      client={client}
      history={history}
    />,
    root
  )
})

const AppComponent = props => (
  <I18n lang={props.lang} polyglot={props.polyglot}>
    <CozyProvider client={props.client}>
      <StyledApp>
        <Router history={props.history} routes={AppRoute} />
      </StyledApp>
    </CozyProvider>
  </I18n>
)

const HotedApp = hot(module)(AppComponent)
