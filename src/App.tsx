import { createMuiTheme, MuiThemeProvider } from "@material-ui/core";
import React from "react";
import Home from "./screens/Home";

const App: React.FC = () => {
  return (
    <MuiThemeProvider theme={createMuiTheme({ palette: { type: "dark" } })}>
      <Home />
    </MuiThemeProvider>
  );
};

export default App;
