import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Pages from "./components/Pages.tsx";

import './App.css'

const darkTheme = createTheme({
    palette: {
        mode: 'light',
    },
})

const App = () => {
    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
                <Pages/>
        </ThemeProvider>
    );
};

export default App;