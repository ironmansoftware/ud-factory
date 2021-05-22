import React from 'react';
import UdDashboard from './dashboard.jsx'
import {
    BrowserRouter as Router,
    Route,
    Switch
} from 'react-router-dom'
// import ErrorCard from './../Components/framework/error-card'
// import NotAuthorized from '../Components/framework/not-authorized.jsx';
// import NotRunning from '../Components/framework/not-running.jsx';

const App = () => {
    return (<Router basename={window.baseUrl}>
        <div className="ud-dashboard">
            <Switch>
                {/* <Route path="/not-authorized" component={NotAuthorized} />
                <Route path="/not-running" component={NotRunning} /> */}
                <Route path="/" component={UdDashboard} />
            </Switch>
        </div>
    </Router> )
}

export default App;