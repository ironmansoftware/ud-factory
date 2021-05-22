import React from 'react';
import { fetchGet, fetchPost, fetchDelete, fetchPut, fetchPostRaw, fetchPostFormData, fetchPostHeaders, disableFetchService } from './fetch-service.jsx';
import PubSub from 'pubsub-js';
var _ = require('lodash');

// Imports

const getComponentData = (id) => {
    return new Promise((resolve, reject) => {
        UniversalDashboard.get(`/api/internal/component/element/${id}`, (data) => {
            if (data.error) reject(data.error.message);
            else resolve(data)
        });
    });
};

const sendComponentState = (requestId, state) => {
    return new Promise((resolve, reject) => {
        UniversalDashboard.post(`/api/internal/component/element/sessionState/${requestId}`, state, (data) => {
            if (data.error) reject(data.error.message);
            else resolve(data)
        });
    });
}

const post = (id, data) => {
    return new Promise((resolve, reject) => {
        UniversalDashboard.post(`/api/internal/component/element/${id}`, data, (returnData) => {
            resolve(returnData)
        });
    });
}

const postWithHeaders = (id, data, headers) => {
    return new Promise((resolve, reject) => {
        UniversalDashboard.postWithHeaders(`/api/internal/component/element/${id}`, data, (returnData) => {
            resolve(returnData)
        }, headers);
    });
}

const subscribeToIncomingEvents = (id, callback) => {
    const incomingEvent = (id, event) => {

        let type = event.type;
        if (type === "requestState")
        {
            type = "getState"
        }

        callback(type, event);
    }

    return UniversalDashboard.subscribe(id, incomingEvent);
}

const unsubscribeFromIncomingEvents = (token) => {
    UniversalDashboard.unsubscribe(token)
}

const render = (component, history) => {
    if (!isString(component))
    {
        // set props version
        if (!component.version)
        {
            component.version = "0";    
        }
            
        if (!history && component.history) {
            history = component.history;
        }
    }

    return UniversalDashboard.renderComponent(component, history);
}

export const withComponentFeatures = (component) => {
    const highOrderComponent = (props) => {
        const [componentState, setComponentState] = react.useState(props);
        react.useEffect(() => {
            setComponentState(props);
        }, [props.version])

        const notifyOfEvent = (eventName, value) => {
            UniversalDashboard.publish('element-event', {
                type: "clientEvent",
                eventId: props.id + eventName,
                eventName: eventName,
                eventData: value
            });
        }
    
        const incomingEvent = (type, event) => {
            if (type === "setState")
                setComponentState({
                    ...componentState,
                    component: {
                        ...componentState.component,
                        ...event.state
                    } 
                });
    
            if (type === "getState") {
                sendComponentState(event.requestId, componentState);
            }
                
            if (type === "addElement")
            {
                let children = componentState.children;
                if (children == null)
                {
                    children = []
                }
    
                children = children.concat(event.elements);
    
                setComponentState({...componentState, children});
            }
    
            if (type === "clearElement")
            {
                setComponentState({...componentState, children: []});
            }
    
            if (type === "removeElement")
            {
                // This isn't great
                setComponentState({...componentState, hidden: true});
            }
    
            if (type === "syncElement") 
            {
                setComponentState({...componentState, version: Math.random().toString(36).substr(2, 5) })
            }
        }

        react.useEffect(() => {
            const token = subscribeToIncomingEvents(props.component.id, incomingEvent)
            return () => {
                unsubscribeFromIncomingEvents(token)
            }
        });
        
        const additionalProps = {
            render,
            setState: (state) => {
                let newComponentState = {
                    ...componentState,
                    ...state
                }
                setComponentState(newComponentState);
            },
            publish: UniversalDashboard.publish,
            notifyOfEvent,
            post,
            subscribeToIncomingEvents,
            unsubscribeFromIncomingEvents
        }

        if (componentState.component.properties != null)
        {
            const properties = componentState.component.properties;
            Object.keys(properties).forEach(x => {
                if (properties[x] != null && properties[x].endpoint)
                {
                    additionalProps[x] = (data) => {
    
                        let headers = {}
                        if (properties[x].accept && properties[x].accept !== '') {
                            headers['Accept'] = properties[x].accept;
                        } 
    
                        if (properties[x].contentType && properties[x].contentType !== '') {
                            headers['Content-Type'] = properties[x].contentType;
                        } 
    
                        return postWithHeaders(properties[x].name, {}, headers);
                    }
                }
            })
            
            if (properties.hidden) {
                return react.createElement(react.Fragment);
            }
        }

        return component({ ...props, ...componentState, ...additionalProps})
    }

    return highOrderComponent;
}

function isEmpty(obj) {
    for(var key in obj) { 
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

function isString (obj) {
    return (Object.prototype.toString.call(obj) === '[object String]');
}

const InternalRender = (props) => {
    const { component, history, ...restOfProps } = props;
    const comp = _.get(componentList, component.type);

    if (comp == null) return <React.Fragment />

    return React.createElement(comp, {
        ...component.properties,
        ...restOfProps,
        key: component.id,
        history
    }, renderComponent(component.content, history));
}

export const Render = withComponentFeatures(InternalRender);

const renderComponent = (component, history) => {
    if (component == null) return <React.Fragment />;
    if (isEmpty(component)) return <React.Fragment />;

    if (component.$$typeof === Symbol.for('react.element'))
    {
        return component;
    }

    if (Array.isArray(component)) {
        return component.map(x => renderComponent(x, history) );
    }

    if (isString(component)) {
        try 
        {
            component = JSON.parse(component);
        }
        catch 
        {
            return component;
        }
    }

    if (component.type == null) return <React.Fragment />;

    const comp = _.get(componentList, component.type);

    if (comp == null)
    {
        return React.createElement(component.type, {
            ...component.properties,
            key: component.id,
            history
        }, renderComponent(component.content, history) );
    }

    return <Render component={component} history={history} />
}

export const UniversalDashboardService = {
    get: fetchGet,
    post: fetchPost,
    postFormData: fetchPostFormData,
    postRaw: fetchPostRaw,
    postWithHeaders: fetchPostHeaders,
    put: fetchPut,
    delete: fetchDelete,
    subscribe: PubSub.subscribe,
    unsubscribe: PubSub.unsubscribe,
    publish: PubSub.publishSync,
    connectionId: '',
    sessionId: '',
    sessionTimedOut: false,
    onSessionTimedOut: () => {}, 
    disableFetchService: disableFetchService,
    renderComponent
}
