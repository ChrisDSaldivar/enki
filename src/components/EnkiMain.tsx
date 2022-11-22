/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { useEffect, useState, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import * as styles from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Resizable } from 're-resizable';
import { Buffer } from 'buffer';
import { Octokit } from '@octokit/rest';
import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types';
import NoteModal from './noteModal';
import langMap from '../utils/utils';

const tmpOctokit = new Octokit();

type Commits = GetResponseDataTypeFromEndpointMethod<
  typeof tmpOctokit.repos.listCommits
>;

type RepoContent = GetResponseDataTypeFromEndpointMethod<
  typeof tmpOctokit.rest.repos.getContent
>;

type Commit<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

interface CommitBundle {
  commit: Commit<Commits>;
  data: RepoContent;
}

interface File {
  name: string;
  ref: string;
}

async function getGitHubName(octokit: Octokit) {
  try {
    const res = await octokit.users.getAuthenticated();
    const { html_url: htmlUrl, login } = res.data;

    const username = htmlUrl.split('/').at(-1) ?? login;
    return username;
  } catch {
    return '';
  }
}

interface Props {
  OctokitContext: React.Context<{
    octokit: Octokit | undefined;
    setOctokit: any;
  }>;
}

export default function EnkiMain(props: Props) {
  const { OctokitContext } = props;
  const { octokit: octokitContext } = useContext(OctokitContext);
  const navigate = useNavigate();
  if (!octokitContext) {
    navigate('/');
  }

  const octokit = octokitContext as Octokit;

  const [commits, updateCommits] = useState<CommitBundle[]>([]);
  const [files, updateFiles] = useState<File[]>([]);
  const [repos, updateRepos] = useState<string[]>([]);
  const [commitRef, updateCommitRef] = useState<string>('');
  const [code, updateCode] = useState<string>('');
  const [output, updateOutput] = useState<string>('');
  const [activeFile, updateActiveFile] = useState<string>('');
  const [lineNumber, updateLineNumber] = useState<number>(0);
  const [editorTheme, updateEditorTheme] = useState<string>('vscDarkPlus');
  const [open, setOpen] = useState(false);

  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [notes, updateNotes] = useState<any[]>([]);

  async function getRepos() {
    // TODO: Update code so commits from repos the user collaborates on are
    // also accessible. Currently we can get the repos but not the commits
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      type: 'owner',
      sort: 'updated',
      direction: 'desc',
    });

    updateRepos(data.map((repo) => repo.name));
  }

  function displayNotes() {
    const linenumberSpans = document.querySelectorAll('span.linenumber');

    notes.forEach((note) => {
      let span: HTMLElement | Element | null =
        linenumberSpans[note.lineNumber - 1];
      if (!span) {
        return;
      }

      if (span.parentElement?.tagName !== 'pre') {
        span = span.parentElement;
      }

      span?.classList.add('note-available');
    });
  }

  async function getNotes() {
    window.electron.ipcRenderer.sendMessage('get-notes', [
      { owner, commit: commitRef, file: activeFile },
    ]);
  }

  async function getCommits() {
    if (!repo) {
      return;
    }
    /* eslint-disable-next-line */
      console.log(`Getting commits for ${owner}/${repo}`);
    try {
      const commits = await octokit.repos.listCommits({
        owner,
        repo,
      });

      const newCommits = await Promise.all(
        commits.data.map(async (commit) => {
          const res = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: '.',
            ref: commit.sha,
          });

          return { commit, data: res.data };
        })
      );

      updateCommits(newCommits);
    } catch {
      /* empty */
    }
  }

  const getFile = async (file: string, commit_sha = '') => {
    const res = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: file,
      ref: commit_sha,
    });

    return res.data;
  };

  async function getFileContent(name: string, ref: string) {
    updateCode('');
    const log = await getFile(name, ref);
    /* eslint-disable-next-line */
      /* @ts-ignore */
    const text = Buffer.from(log.content, 'base64').toString('ascii');

    return text;
  }

  async function handleCommitClick(
    evt: React.MouseEvent<HTMLLIElement, MouseEvent>
  ) {
    /* eslint-disable-next-line */
    /* @ts-ignore */
    const ref = evt?.target.dataset.key;
    updateCommitRef(ref);
    updateCode('');

    const commit = commits.find(
      (currCommit) => currCommit.commit.sha === ref
    )?.data;
    const files = commit
      /* eslint-disable-next-line */
      /* @ts-ignore */
      ?.filter((file: { type: string }) => file.type === 'file')
      ?.map((file: { name: string; type: string; path: string }) => {
        return { name: file.name, ref, type: file.type, path: file.path };
      });

    /* eslint-disable-next-line */
    /* @ts-ignore */
    const displayFiles = files?.filter(
      /* eslint-disable-next-line */
      (file: any) => file.name !== 'log.txt' && !file.name.startsWith('.')
    );
    updateFiles(displayFiles ?? []);

    /* eslint-disable-next-line */
      /* @ts-ignore */
    const outputFile = files.find((file) => file.name === 'log.txt');
    if (outputFile) {
      const outputText = await getFileContent(outputFile.name, outputFile.ref);
      updateOutput(outputText);
    } else {
      updateOutput('');
    }

    /* eslint-disable-next-line */
      /* @ts-ignore */
    const file =
      displayFiles.find((file: any) => file.name.endsWith('.py')) ??
      displayFiles[0];
    updateActiveFile(file.name);

    const text = await getFileContent(file.name, file.ref);

    updateCode(text);
    return text;
  }

  async function handleFileClick(evt: any) {
    const { ref, fileName } = evt.target.dataset;

    updateFiles(files ?? []);
    updateActiveFile(fileName);

    const text = await getFileContent(fileName, commitRef);
    updateCode(text);
  }

  function updateStyle(evt: React.ChangeEvent<HTMLSelectElement>) {
    updateEditorTheme(evt.target.value);
  }

  function takeNote(lineNumber: number) {
    updateLineNumber(lineNumber);
    setOpen(true);
  }

  function refreshRepo() {
    getCommits();
  }

  function switchRepo(evt: React.ChangeEvent<HTMLSelectElement>) {
    const selectedRepo = evt.target.value;
    if (selectedRepo === repo) return;
    setRepo(selectedRepo);

    updateCommits([]);
    updateFiles([]);
    updateCode('');
    updateOutput('');
  }

  useEffect(() => {
    setRepo(repos[0]);
  }, [repos]);

  useEffect(() => {
    getCommits();
  }, [repo]);

  useEffect(() => {
    displayNotes();
  }, [notes]);

  useEffect(() => {
    getNotes();
  }, [code]);

  useEffect(() => {
    getRepos();
  }, [owner]);

  useEffect(() => {
    const updateName = async () => {
      setOwner(await getGitHubName(octokit));
    };

    updateName();
    window.electron.ipcRenderer.on('get-notes', (arg) => {
      /* eslint-disable-next-line */
        /* @ts-ignore */
      const notes = arg.map((val) => val.dataValues);

      updateNotes(notes);
    });
  }, []);

  return (
    <div>
      <NoteModal
        open={open}
        setOpen={setOpen}
        commitRef={commitRef}
        activeFile={activeFile}
        lineNumber={lineNumber}
        repo={repo}
        owner={owner}
      />

      <div className="bg-zinc-900 text-gray-300 text-center h-screen w-screen flex flex-col">
        <div className="top-bar flex p-4 items-center h-16">
          <div className="repo-name bold text-lg fira text-cyan-500">
            {owner}/{repo}
            <div className="ml-2 inline-flex items-center rounded border border-transparent px-2.5 py-1.5 text-xs font-medium border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black ">
              <label htmlFor="editor_style">Change Repo: </label>
              <select
                name="style"
                id="editor_style"
                onChange={switchRepo}
                className="bg-zinc-600 text-white rounded-lg text-sm p-1"
                value={repo}
              >
                {repos.map((repo) => {
                  return (
                    <option key={repo} value={repo}>
                      {repo}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="theme-select mx-auto">
            <label htmlFor="editor_style">Theme: </label>
            <select
              name="style"
              id="editor_style"
              onChange={updateStyle}
              className="bg-zinc-600 text-white rounded-lg text-sm p-1"
              value={editorTheme}
            >
              {Object.keys(styles).map((style) => {
                return (
                  <option key={style} value={style}>
                    {style}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="refresh">
            <button
              type="button"
              onClick={refreshRepo}
              className="inline-flex items-center rounded border border-transparent px-2.5 py-1.5 text-xs font-medium border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black active:bg-cyan-500 "
            >
              Refresh Commits
            </button>
          </div>
        </div>

        <div className="flex h-full border-t border-gray-500 overflow-scroll scrollbar-hide overscroll-contain">
          <div className="commits w-96 h-full border-r border-gray-500 overflow-scroll scrollbar-hide overscroll-contain">
            <ul className="flex flex-col divide-y text-sm">
              {commits.length > 0
                ? commits.map((commit) => {
                    return (
                      <li
                        className={`${
                          commit.commit.sha === commitRef ? 'bg-zinc-700' : ''
                        } active:bg-zinc-700 hover:bg-zinc-600 cursor-pointer p-2`}
                        onClick={handleCommitClick}
                        data-key={commit.commit.sha}
                        key={commit.commit.sha}
                      >
                        {commit.commit.commit.message}
                      </li>
                    );
                  })
                : 'This repo has no commits'}
            </ul>
          </div>
          <div className="files w-72 max-w-96 max-h-full overflow-scroll scrollbar-hide overscroll-contain">
            <ul className="flex flex-col divide-y h-full border-r border-gray-500">
              {files.map((file) => {
                /* eslint-disable-next-line */
                  /* @ts-ignore */
                return (
                  <li
                    className={`${
                      file.name === activeFile ? 'bg-zinc-700' : ''
                    } active:bg-zinc-700 hover:bg-zinc-600 cursor-pointer`}
                    onClick={handleFileClick}
                    data-file-name={file.name}
                    key={file.name}
                  >
                    {file.name}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="viewer text-left h-full w-full overflow-scroll scrollbar-hide overscroll-contain">
            {code && (
              <SyntaxHighlighter
                showLineNumbers
                showInlineLineNumbers
                /* eslint-disable-next-line */
                  /* @ts-ignore */
                language={langMap[activeFile.split('.')?.at(-1)]?.toLowerCase()}
                /* eslint-disable-next-line */
                  /* @ts-ignore */
                style={styles[editorTheme]}
                wrapLines
                lineProps={(lineNumber) => ({
                  style: {
                    display: 'block',
                    cursor: 'pointer',
                    fontVariantLigatures: 'none',
                  },
                  onClick() {
                    takeNote(lineNumber);
                  },
                  onMouseEnter(evt: React.MouseEvent<HTMLElement, MouseEvent>) {
                    /* eslint-disable-next-line */
                      /* @ts-ignore */
                    if (evt.target.classList.contains('linenumber')) {
                      return;
                    }
                    /* eslint-disable-next-line */
                      /* @ts-ignore */
                    evt.target.classList.add('hover:bg-blue-400');
                  },
                })}
              >
                {code}
              </SyntaxHighlighter>
            )}
          </div>
        </div>

        {output && (
          <Resizable
            enable={{
              top: true,
              right: false,
              bottom: false,
              left: false,
              topRight: false,
              bottomRight: false,
              bottomLeft: false,
              topLeft: false,
            }}
            className="relative fira text-left mt-auto bg-zinc-900 text-gray-300 w-full p-4 border-t border-gray-500"
          >
            <div className="font-sans absolute top-1 left-2 text-cyan-300 bg-zinc-700 bg-opacity-60 p-1 rounded">
              Output
            </div>
            <pre className="mt-5">{output}</pre>
          </Resizable>
        )}
      </div>
    </div>
  );
}
