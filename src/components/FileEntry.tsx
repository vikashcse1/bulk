import React, { Component } from "react";
import { Checkbox, FormControlLabel } from "@material-ui/core";

type Props = {
  file: File;
  checked: boolean;
  index: number;
  onChange: React.ChangeEventHandler;
};

export default class FileEntry extends Component {
  props: Props;
  constructor(props: Props) {
    super(props);

    this.props = props;
  }

  render() {
    return (
      <FormControlLabel
        control={
          <div>
            <Checkbox
              checked={this.props.checked}
              value={this.props.file.name}
              onChange={this.props.onChange}
            />
          </div>
        }
        label={`${this.props.index + 1}: ${this.props.file.name}`}
      />
    );
  }
}
