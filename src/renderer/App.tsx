/* eslint-disable react/prop-types */

import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './App.css';
import { uuidv4 } from './utils';

const FileRefModal = ({ fileRef, onClose }) => {
  const [name, setName] = useState(fileRef.name);
  const [page, setPage] = useState(fileRef.page);
  const [pdfPath, setPdfPath] = useState(fileRef.pdfPath);
  const [imgURL, setImgURL] = useState(fileRef.imgURL);

  const leave = () => {
    document.onpaste = function () {};

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

    document.onpaste = function (pasteEvent) {
      const item = pasteEvent.clipboardData.items[0];
      if (item.type.indexOf('image') === 0) {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = function (event) {
          setImgURL(event.target.result);
        };
        reader.readAsDataURL(blob);
      }
    };
  });

  return (
    <div id="ModalBackground" className="ModalBackground" onClick={onClick}>
      <div className="FileRefModal">
        <div>
          Name{' '}
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          Page{' '}
          <input
            placeholder="Page"
            type="number"
            value={page}
            min={1}
            onChange={(e) => setPage(e.target.value)}
          />
        </div>
        <div>
          PDF Path{' '}
          <input
            type="file"
            onChange={(e) => setPdfPath(e.target.files[0].path)}
          />
        </div>
        <div>
          <img src={imgURL} />
        </div>
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
      {hasImg && <img src={fileRef.imgURL} />}
    </div>
  );
};

const ReferencesContainer = () => {
  const [showModal, setShowModal] = useState(false);
  const [editedRef, setEditedRef] = useState(null);
  const [fileRefs, _setFileRefs] = useState([]);

  const onOpenPDF = (fr) => {
    window.electron.ipcRenderer.openPdf(fr.pdfPath, fr.page);
  };

  const setFileRefs = (frs) => {
    _setFileRefs(frs);
    window.electron.ipcRenderer.saveReferences(frs);
  };

  const onRemove = (fr) => {
    const doDelete = confirm('Are you sure you want to delete this reference?');
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
      name: '',
      pdfPath: '',
      page: 0,
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

  useEffect(() => {
    window.electron.ipcRenderer.getReferences();
    window.electron.ipcRenderer.once('get-references', _setFileRefs);
  }, [_setFileRefs]);

  return (
    <div className="AppContainer">
      <h1 style={{ fontWeight: 100 }}>PDF Snippets</h1>
      <div className="ReferencesContainer">
        {fileRefs.map((fr) => (
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
          New Reference
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
