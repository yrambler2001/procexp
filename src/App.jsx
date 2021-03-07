/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/mouse-events-have-key-events */
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import './App.global.css';
import listToTree from 'list-to-tree-lite';
import { Table, Tooltip } from 'antd';
import './index.less';
import psList from 'ps-list';
// import { execSync } from 'child_process';
import { Resizable } from 'react-resizable';
import equal from 'fast-deep-equal/es6/react';
import { execSync } from 'child_process';
import { orderBy } from 'lodash';
import { ContextMenu, MenuItem, ContextMenuTrigger } from 'react-contextmenu';

const { username } = require('os').userInfo();

const MemoTable = React.memo(Table, equal);

const ResizableTitle = (props) => {
  const { onResize, width, ...restProps } = props;
  // if (!width) {
  //   return <th {...restProps} />;
  // }

  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          onClick={(e) => {
            e.stopPropagation();
          }}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};
// execSync('ps awwxo pid,comm > a');
const daemonUsers = ['_windowserver'];
const getColorByRecord = (record) => {
  if (record.isApp) return 'rgb(255,255,160)';
  if (record.isService2) return 'rgb(255,208,208)';
  if (record.user === username) return 'rgb(208,208,255)';
  return 'transparent';
};
const TR = (props) => {
  // eslint-disable-next-line react/destructuring-assignment
  const { record } = props.children[0].props;
  const color = getColorByRecord(record);
  return <tr {...props} style={{ '--background': color }} />;
};
// const ee = (c) => c.children.map((c) => c.props.record);
// const memoTr = React.memo(TR, (prev, curr) => console.log(prev)||equal(ee(prev), ee(curr)));
const components = {
  header: {
    cell: ResizableTitle,
  },
  body: {
    row: TR, // (props) => console.log(props) || <tr {...props} />,
  },
};
const NameComponent = ({ name, cmd }) => {
  return (
    <>
      <Tooltip
        placement="rightTop"
        title={cmd}
        mouseEnterDelay={0}
        destroyTooltipOnHide
        getPopupContainer={() =>
          document.body.querySelector('body > #root> #tooltip')
        }
      >
        {/* <ContextMenuTrigger id="same_unique_identifier"> */}
        {/* </ContextMenuTrigger> */}
        <span>{name}</span>
      </Tooltip>
      {/* <ContextMenu id="same_unique_identifier">
        <MenuItem data={{ foo: 'bar' }} onClick={console.log}>
          ContextMenu Item 1
        </MenuItem>
        <MenuItem data={{ foo: 'bar' }} onClick={console.log}>
          ContextMenu Item 2
        </MenuItem>
        <MenuItem divider />
        <MenuItem data={{ foo: 'bar' }} onClick={console.log}>
          ContextMenu Item 3
        </MenuItem>
      </ContextMenu> */}
    </>
  );
};
const MemoNameComponent = React.memo(NameComponent);
const columns = [
  {
    title: 'Name',
    // dataIndex: 'name',
    width: 300,
    key: 'name',
    fixed: 'left',
    render: (e) => <MemoNameComponent name={e.name} cmd={e.cmd} />,
    ellipsis: true,
  },
  {
    // dataIndex: 'cpu',
    width: 40,
    title: 'CPU',
    key: 'cpu',
    render: (e) => (e.cpu ? e.cpu : null),
    ellipsis: true,
  },
  {
    // dataIndex: 'cpu',
    width: 80,
    title: 'Private Bytes',
    dataIndex: 'vsz',
    key: 'vsz',
    ellipsis: true,
  },
  {
    // dataIndex: 'cpu',
    width: 80,
    title: 'Working Set',
    dataIndex: 'rss',
    key: 'rss',
    ellipsis: true,
  },
  {
    dataIndex: 'pid',
    width: 40,
    title: 'PID',
    key: 'pid',
    ellipsis: true,
  },
  {
    dataIndex: 'user',
    width: 100,
    title: 'User',
    key: 'user',
    ellipsis: true,
  },
];
const updateP = async () => {
  const list = await psList();
  const serviceIds = String(execSync('sudo launchctl list'))
    .split('\n')
    .map((e) => +e.split('\t')[0])
    .filter((e) => e !== '-');

  const trees = listToTree(list, {
    idKey: 'pid',
    parentKey: 'ppid',
    childrenKey: 'children',
  });
  const a = (arr) => {
    if (Array.isArray(arr)) arr.forEach((e) => a(e));
    else if (arr) {
      if (!arr.children.length) delete arr.children;
      a(arr.children);
      arr.key = arr.pid;
      arr.isService = serviceIds.includes(arr.pid);
      arr.user = arr.user || '';
      arr.lowercaseName = arr.name.toLowerCase();
      arr.isService2 =
        arr.isService ||
        daemonUsers.includes(arr.user) ||
        (arr.user.startsWith('_') && arr.user.endsWith('d')) ||
        arr.cmd.includes('daemon') ||
        arr.cmd.includes('launchd') ||
        arr.cmd.includes('distnoted') ||
        (arr.cmd.startsWith('/System/Library/PrivateFrameworks/') &&
          arr.name.endsWith('d')) ||
        (arr.cmd.startsWith('/usr/libexec/') && arr.name.endsWith('d')) ||
        (arr.cmd.startsWith('/System/Library/CoreServices/') &&
          arr.name.endsWith('d')) ||
        (arr.cmd.startsWith('/System/Library/Frameworks/') &&
          arr.name.endsWith('d'));
      arr.isApp = arr.cmd.startsWith('/Applications');
      arr.rss = `${new Intl.NumberFormat('ru-RU').format(arr.rss)} K`;
      arr.vsz = `${new Intl.NumberFormat('ru-RU').format(arr.vsz)} K`;
    }
  };
  a(trees);
  const sortThe = (arr) => {
    if (Array.isArray(arr))
      return orderBy(
        arr.map((e) => sortThe(e)),
        ['isService2', 'lowercaseName'],
        ['desc', 'asc']
      );
    if (arr.children) arr.children = sortThe(arr.children);
    return arr;
  };
  const treesSorted = sortThe(trees);
  return treesSorted;
};
const Hello = () => {
  const [processes, setProcesses] = useState([]);
  useEffect(() => {
    // eslint-disable-next-line promise/catch-or-return
    updateP().then(setProcesses);
    const i = setInterval(() => {
      // eslint-disable-next-line promise/catch-or-return
      updateP().then(setProcesses);
    }, 2000);
    return () => clearInterval(i);
  }, []);
  const [stateColumns, setColumns] = useState(columns);
  if (!processes.length) return null;
  const handleResize = (index) => (e, { size }) => {
    setColumns((_stateColumns) => {
      const nextColumns = [..._stateColumns];
      nextColumns[index] = {
        ...nextColumns[index],
        width: size.width,
      };
      return nextColumns;
    });
  };
  const currentColumns = stateColumns.map((col, index) => ({
    ...col,
    onHeaderCell: (column) => ({
      width: column.width,
      onResize: handleResize(index),
    }),
  }));

  return (
    <div>
      <MemoTable
        components={components}
        columns={currentColumns}
        // rowSelection={{ ...rowSelection, checkStrictly }}
        expandable={{ defaultExpandAllRows: true }}
        dataSource={processes}
        scroll={{ y: 850 }}
      />
    </div>
  );
};

export default function App() {
  return (
    <>
      <Router>
        <Switch>
          <Route path="/" component={Hello} />
        </Switch>
      </Router>
      <div id="tooltip" />
    </>
  );
}
