/* eslint-disable react/prop-types */

import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import './App.css';
import { uuidv4 } from './utils';

const FilePath = ({ value, onChange }) => {
  const [path, setPath] = useState(value);
  const el = useRef(null);

  const update = (e) => {
    const val = e.target.files[0].path;
    setPath(val);
    onChange(val);
  };

  const clicked = () => {
    el.current.click();
  };

  const text = path || 'Click to select a path to the PDF';

  return (
    <div className="FilePath" onClick={clicked}>
      <span>{text}</span>
      <input
        ref={el}
        type="file"
        onChange={update}
        style={{ display: 'none' }}
      />
    </div>
  );
};

const ImagePaster = ({ value, onChange }) => {
  const [imgURL, setImgURL] = useState(value);
  const [waitingForPaste, setWaitingForPaste] = useState(false);
  const [isHover, setIsHover] = useState(false);

  const startWaiting = () => {
    setWaitingForPaste(true);
    document.onpaste = function (pasteEvent) {
      const item = pasteEvent.clipboardData.items[0];
      if (item.type.indexOf('image') === 0) {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = function (event) {
          const url = event.target.result;
          setImgURL(url);
          onChange(url);
          document.onpaste = function () {};
          setWaitingForPaste(false);
        };
        reader.readAsDataURL(blob);
      }
    };
  };

  const onClick = () => {
    if (waitingForPaste) {
      document.onpaste = function () {};
      setWaitingForPaste(false);
    } else {
      startWaiting();
    }
  };

  const visible = !waitingForPaste || !value ? '' : 'Visible';
  const imgStyle = isHover || waitingForPaste ? { filter: 'blur(2px)' } : {};

  return (
    <div
      className="ImagePaster"
      onClick={onClick}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <div className={`Overlay ${visible}`}>
        {waitingForPaste && <div>Ctrl+V to paste new image</div>}
        {waitingForPaste && <div>(click to cancel)</div>}
        {(!waitingForPaste || (!value && !waitingForPaste)) && (
          <div>Click to change</div>
        )}
      </div>
      <img
        className={waitingForPaste ? ['Blur'] : []}
        style={imgStyle}
        src={imgURL}
      />
    </div>
  );
};

const FileRefModal = ({ fileRef, onClose }) => {
  const [name, setName] = useState(fileRef.name);
  const [page, setPage] = useState(fileRef.page);
  const [pdfPath, setPdfPath] = useState(fileRef.pdfPath);
  const [imgURL, setImgURL] = useState(fileRef.imgURL);

  const leave = () => {
    fileRef.name = name;
    fileRef.page = page;
    fileRef.pdfPath = pdfPath;
    fileRef.imgURL = imgURL;

    onClose();
  };

  const onClick = (e) => {
    if (e.target.id === 'ModalBackground') {
      leave();
    }
  };

  useEffect(() => {
    const escFunction = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escFunction, false);
        leave();
      }
    };

    document.addEventListener('keydown', escFunction, false);
  });

  return (
    <div id="ModalBackground" className="ModalBackground" onClick={onClick}>
      <div className="FileRefModal">
        <div className="FirstLine">
          <input
            className="NameInput"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="PageInput">
            <span>p</span>
            <input
              placeholder="Page"
              type="number"
              value={page}
              min={1}
              onChange={(e) => setPage(e.target.value)}
            />
          </div>
        </div>

        <FilePath value={pdfPath} onChange={setPdfPath} />
        <ImagePaster value={imgURL} onChange={setImgURL} />
      </div>
    </div>
  );
};

const FileRef = ({ fileRef, onOpenPDF, onRemove, onEdit }) => {
  const hasImg = !!fileRef.imgURL;

  const contentRow = (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <div className="Name">{fileRef.name}</div>
        {/* <div className="Page">p{fileRef.page}</div> */}
      </div>
      <div style={{ display: 'flex' }}>
        <div
          className="Button"
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onOpenPDF(fileRef);
          }}
        >
          🧿
        </div>

        <div
          className="Button"
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(fileRef);
          }}
        >
          🗑
        </div>
      </div>
    </div>
  );
  return (
    <div
      className="FileRef"
      onClick={() => onEdit(fileRef)}
      role="button"
      tabIndex={0}
    >
      {contentRow}
      {hasImg && <hr />}
      {hasImg && <img src={fileRef.imgURL} />}
    </div>
  );
};

const ReferencesContainer = () => {
  const [showModal, setShowModal] = useState(false);
  const [editedRef, setEditedRef] = useState(null);
  const [fileRefs, _setFileRefs] = useState([]);
  const [searchString, setSearchString] = useState('');

  const setFileRefs = (frs) => {
    _setFileRefs(frs);
    window.electron.ipcRenderer.saveReferences(frs);
  };

  const onOpenPDF = (fr) => {
    window.electron.ipcRenderer.openPdf(fr.pdfPath, fr.page);
  };

  const onRemove = (fr) => {
    const doDelete = confirm('Are you sure you want to delete this snippet?');
    if (doDelete) {
      setFileRefs(fileRefs.filter((ofr) => ofr.id !== fr.id));
    }
  };

  const onEdit = (fr) => {
    setEditedRef({ ...fr });
    setShowModal(true);
  };

  const createReference = () => {
    setEditedRef({
      name: '(Untitled)',
      pdfPath: '',
      page: 1,
      imgURL: '',
    });
    setShowModal(true);
  };

  const onCloseModal = () => {
    const index = fileRefs.findIndex((fr) => fr.id === editedRef.id);
    if (index > -1) {
      const newRefs = fileRefs.concat([]);
      newRefs[index] = { ...editedRef };
      setFileRefs(newRefs);
    } else {
      setFileRefs([{ ...editedRef, id: uuidv4() }].concat(fileRefs));
    }
    setShowModal(false);
  };

  const searchOn = (fileRefs) => {
    if (searchString === '') return fileRefs;

    return fileRefs.filter(
      (fr) => fr.name.toLowerCase().indexOf(searchString.toLowerCase()) >= 0
    );
  };

  const clearSearch = () => {
    setSearchString('');
  };

  useEffect(() => {
    window.electron.ipcRenderer.getReferences();
    window.electron.ipcRenderer.once('get-references', _setFileRefs);
  }, [_setFileRefs]);

  return (
    <div className="AppContainer">
      <h1 style={{ fontWeight: 100, cursor: 'default' }}>PDF Snippets</h1>
      <div className="ReferencesContainer">
        <div className="Header">
          <div className="FileRef Search">
            <input
              placeholder="Search..."
              type="text"
              value={searchString}
              onChange={(e) => {
                setSearchString(e.target.value);
              }}
            />
            <div
              className="Button"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                clearSearch();
              }}
            >
              ✖️
            </div>
          </div>
          <div
            className="FileRef AddFileRef"
            onClick={createReference}
            role="button"
            tabIndex={0}
          >
            New
          </div>
        </div>

        {searchOn(fileRefs).map((fr) => (
          <FileRef
            fileRef={fr}
            onOpenPDF={onOpenPDF}
            onRemove={onRemove}
            onEdit={onEdit}
            key={fr.id}
          />
        ))}
      </div>

      {showModal && <FileRefModal fileRef={editedRef} onClose={onCloseModal} />}
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ReferencesContainer />} />
      </Routes>
    </Router>
  );
}
