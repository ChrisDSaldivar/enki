import { Fragment, useRef, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import TextBox from './textBox';

interface Props {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  commitRef: string;
  activeFile: string;
  lineNumber: number;
  repo: string;
  owner: string;
}

export default function NoteModal(props: Props) {
  const [noteText, updateNoteText] = useState<string>('');

  const { open, setOpen, commitRef, activeFile, lineNumber, repo, owner } =
    props;

  useEffect(() => {
    if (!open) {
      return;
    }

    window.electron.ipcRenderer.once('get-note', (arg) => {
      // eslint-disable-next-line
      /* @ts-ignore */
      const note = arg?.note ?? '';

      updateNoteText(note);
    });

    window.electron.ipcRenderer.sendMessage('get-note', [
      {
        owner,
        lineNumber,
        commit: commitRef,
        file: activeFile,
      },
    ]);
  }, [open, owner, commitRef, activeFile, lineNumber]);

  const cancelButtonRef = useRef(null);
  const textBoxRef = useRef(null);

  function saveNote() {
    const note = {
      lineNumber,
      repo,
      owner,
      commit: commitRef,
      file: activeFile,
      note: noteText,
    };

    // calling IPC exposed from preload script
    window.electron.ipcRenderer.once('create-note', () => {
      window.electron.ipcRenderer.sendMessage('get-notes', [
        { owner, commit: commitRef, file: activeFile },
      ]);
    });

    window.electron.ipcRenderer.sendMessage('create-note', [note]);

    // Note.create(note);
    setOpen(false);
  }

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
        // eslint-disable-next-line
        initialFocus={textBoxRef}
        onClose={setOpen}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-zinc-800 text-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div>
                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-white"
                    >
                      Create Note for {activeFile} on line {lineNumber}
                    </Dialog.Title>
                    <div className="mt-2">
                      <TextBox
                        innerRef={textBoxRef}
                        updateNoteText={updateNoteText}
                        noteText={noteText}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-400 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm"
                    onClick={saveNote}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="bg-red-400 mt-3 inline-flex w-full justify-center rounded-md px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-red-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                    onClick={() => {
                      setOpen(false);
                    }}
                    ref={cancelButtonRef}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
