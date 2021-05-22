import React, { Suspense, useState, useEffect } from 'react'
import { getApiPath, getDashboardId } from './config.jsx'
import PubSub from 'pubsub-js'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import copy from 'copy-to-clipboard'
import useErrorBoundary from 'use-error-boundary';
import {Render} from './universal-dashboard-service';

const dashboardId = getDashboardId();

var connection

function connectWebSocket(sessionId, location, setLoading, history) {
  if (connection) {
    setLoading(false)
  }

  connection = new HubConnectionBuilder()
    .withUrl(getApiPath() + `/dashboardhub?dashboardId=${dashboardId}`)
    .configureLogging(LogLevel.Information)
    .build()

  connection.on('setState', json => {

    var data = JSON.parse(json);

    PubSub.publish(data.componentId, {
      type: 'setState',
      state: data.state,
    })
  })

  connection.on('requestState', json => {

    var data = JSON.parse(json)

    PubSub.publish(data.componentId, {
      type: 'requestState',
      requestId: data.requestId,
    })
  })

  connection.on('removeElement', json => {

    var data = JSON.parse(json);

    PubSub.publish(data.componentId, {
      type: 'removeElement',
      componentId: data.componentId,
      parentId: data.parentId,
    })
  })

  connection.on('clearElement', componentId => {
    PubSub.publish(componentId, {
      type: 'clearElement',
      componentId: componentId,
    })
  })

  connection.on('syncElement', componentId => {
    PubSub.publish(componentId, {
      type: 'syncElement',
      componentId: componentId,
    })
  })

  connection.on('testForm', componentId => {
    PubSub.publish(componentId, {
      type: 'testForm',
      componentId: componentId,
    })
  })

  connection.on('addElement', json => {
    var data = JSON.parse(json);

    PubSub.publish(data.componentId, {
      type: 'addElement',
      componentId: data.componentId,
      elements: data.elements,
    })
  })

  connection.on('showModal', json => {
    var props = JSON.parse(json);
    PubSub.publish('modal.open', props)
  })

  connection.on('closeModal', () => {
    PubSub.publish('modal.close', {})
  })

  connection.on('redirect', json => {
    var data = JSON.parse(json);

    if (data.url.startsWith('/'))
    {
       history.push(data.url);
    }
    else if (data.openInNewWindow) {
      window.open(data.url)
    } else {
      window.location.href = data.url
    }
  })

  connection.on('refresh', () => {
    window.location.reload();
  })

  connection.on('select', json => {

    var data = JSON.parse(json);
    document.getElementById(data.id).focus()
    if (data.scrollToElement) {
      document.getElementById(data.id).scrollIntoView()
    }
  })

  connection.on('invokejavascript', jsscript => {
    eval(jsscript)
  })

  connection.on('clipboard', json => {

    var data = JSON.parse(json);
    try {
      let isCopyed = data.data !== null || data !== '' ? copy(data.data) : false
      if (data.toastOnSuccess && isCopyed) {
        // toaster.show({
        //   message: 'Copied to clipboard',
        // })
      }
    } catch (err) {
      if (data.toastOnError) {
        // toaster.show({
        //   message: 'Unable to copy to clipboard',
        // })
      }
    }
  })

  connection.on('write', message => {
    PubSub.publish('write', message)
  })

  connection.on('setConnectionId', id => {
    UniversalDashboard.connectionId = id
    setLoading(false)
  })

  PubSub.subscribe('element-event', function(e, data) {
    if (data.type === 'clientEvent') {
      connection
        .invoke(
          'clientEvent',
          data.eventId,
          data.eventName,
          data.eventData,
          location,
        )
        .catch(function(e) {
          toaster.show({
            message: e.message,
            icon: 'fa fa-times-circle',
            iconColor: '#FF0000',
          })
        })
    }

    if (data.type === 'unregisterEvent') {
      connection.invoke('unregisterEvent', data.eventId)
    }
  })

  connection.start().then(x => {
    window.UniversalDashboard.webSocket = connection
    connection.invoke('setSessionId', sessionId)
  })
}

function loadStylesheet(url) {
  var styles = document.createElement('link')
  styles.rel = 'stylesheet'
  styles.type = 'text/css'
  styles.media = 'screen'
  styles.href = url
  document.getElementsByTagName('head')[0].appendChild(styles)
}

function loadJavascript(url, onLoad) {
  var jsElm = document.createElement('script')
  jsElm.onload = onLoad
  jsElm.type = 'application/javascript'
  jsElm.src = url
  document.body.appendChild(jsElm)
}

var sessionCheckToken = null;

const checkSession = () => {
  UniversalDashboard.get(`/api/internal/session/${UniversalDashboard.sessionId}`, () => {}, null, () => {
      UniversalDashboard.sessionTimedOut = true;
      UniversalDashboard.onSessionTimedOut();
      clearInterval(sessionCheckToken);
  })
}

function getLocation(setLocation) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var name = 'location'

      var positionJson = {
        coords: {
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: position.coords.speed,
        },
        timestamp: new Date(position.timestamp).toJSON(),
      }

      var value = JSON.stringify(positionJson)
      value = btoa(value)
      document.cookie = name + '=' + (value || '') + '; path=/'

      setLocation(value)
    })
  }
}

function Dashboard({ history }) {
  const { ErrorBoundary, didCatch, error } = useErrorBoundary()
  const [dashboard, setDashboard] = useState(null)
  const [dashboardError, setDashboardError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState(null);
  const [roles, setRoles] = useState([]);
  const [user, setUser] = useState('');

  const loadData = () => {
    UniversalDashboard.get(
      '/api/internal/dashboard',
      function(json) {
        var dashboard = json.dashboard

        if (dashboard.error) {
          setDashboardError(dashboard.error);
          return;
        }

        if (dashboard.stylesheets) dashboard.stylesheets.map(loadStylesheet)
        if (dashboard.scripts) dashboard.scripts.map(loadJavascript)

        connectWebSocket(json.sessionId, location, setLoading, history)
        UniversalDashboard.sessionId = json.sessionId;

        sessionCheckToken = setInterval(checkSession, 5000);

        UniversalDashboard.design = dashboard.design

        setDashboard(dashboard);

        if (json.roles) {
          setRoles(json.roles);
        }

        if (json.user)
        {
          setUser(json.user);
        }
        
        if (dashboard.geolocation) {
          getLocation(setLocation)
        }
      },
      history,
    )
  }


  useEffect(() => {
    if (dashboard) return

    try {
      loadData()
    } catch (err) {
      setDashboardError(err)
    }
  })

  if (didCatch)
  {
      //return <ErrorCard errorRecords={[{message: error}]}/>
  }

  if (dashboardError) {
    //return <ErrorCard errorRecords={[{message: error}]} />
  }

  if (loading) {
    return <div />
  }

  try {
    return (
        <ErrorBoundary>
              <Render component={dashboard} history={history} />
        </ErrorBoundary>

    )
  } catch (err) {
    setDashboardError(err)
  }

  return null
}

export default Dashboard
