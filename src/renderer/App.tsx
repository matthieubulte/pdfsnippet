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

  useEffect(() => {
    if (!value) {
      startWaiting();
    }
  }, [value]);

  const onClick = () => {
    if (waitingForPaste) {
      document.onpaste = function () {};
      setWaitingForPaste(false);
    } else {
      startWaiting();
    }
  };

  return (
    <div className="ImagePaster" onClick={onClick}>
      {waitingForPaste && (
        <div className="Overlay Visible">
          <div>Ctrl+V to paste new image</div>
          <div>(click to cancel)</div>
        </div>
      )}
      {waitingForPaste || (
        <div className="Overlay">
          <div>Click to change</div>
        </div>
      )}
      <img className={waitingForPaste ? ['Blur'] : []} src={imgURL} />
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
      <div className="Name">{fileRef.name}</div>
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

  const onOpenPDF = (fr) => {
    window.electron.ipcRenderer.openPdf(fr.pdfPath, fr.page);
  };

  const setFileRefs = (frs) => {
    _setFileRefs(frs);
    window.electron.ipcRenderer.saveReferences(frs);
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
      image: '',
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
      setFileRefs(fileRefs.concat([{ ...editedRef, id: uuidv4() }]));
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
      <h1 style={{ fontWeight: 100 }}>PDF Snippets</h1>
      <div className="ReferencesContainer">
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
        {searchOn(fileRefs).map((fr) => (
          <FileRef
            fileRef={fr}
            onOpenPDF={onOpenPDF}
            onRemove={onRemove}
            onEdit={onEdit}
            key={fr.id}
          />
        ))}
        <div
          className="FileRef AddFileRef"
          onClick={createReference}
          role="button"
          tabIndex={0}
        >
          New Snippet
        </div>
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
