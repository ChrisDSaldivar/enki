import { useEffect, useRef, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Octokit } from '@octokit/rest';
import { LockClosedIcon } from '@heroicons/react/20/solid';

import iconFile from '../../assets/icons/512x512.png';

async function authenticateWithGithub(
  authToken: string
): Promise<Octokit | undefined> {
  try {
    const octokit = new Octokit({
      auth: authToken,
    });
    await octokit.users.getAuthenticated();
    return octokit;
  } catch {
    return undefined;
  }
}

interface Props {
  OctokitContext: React.Context<{
    octokit: Octokit | undefined;
    setOctokit: any;
  }>;
}

export default function LoginPage(props: Props) {
  const { OctokitContext } = props;
  const { setOctokit } = useContext(OctokitContext);

  const passwordRef = useRef<HTMLInputElement>(null);
  const authTokenRef = useRef<HTMLInputElement>(null);
  const [displayAuthInput, setDisplayAuthInput] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    window.electron.ipcRenderer.once('check-auth-file', (arg) => {
      const { authFileExists } = arg as { authFileExists: boolean };
      setDisplayAuthInput(!authFileExists);
    });

    window.electron.ipcRenderer.sendMessage('check-auth-file', []);
  }, []);

  async function setAuthToken(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();

    if (!passwordRef.current || !authTokenRef.current) {
      return;
    }

    const pass = passwordRef.current.value;
    const authToken = authTokenRef.current.value;

    passwordRef.current.value = '';
    authTokenRef.current.value = '';

    if (!pass || !authToken) {
      return;
    }

    const octokit = await authenticateWithGithub(authToken);
    if (!octokit) {
      alert('that auth token does not work');
      return;
    }

    setOctokit(octokit);

    window.electron.ipcRenderer.once('set-auth', (arg) => {
      if (arg) {
        navigate('/app');
      } else {
        alert('It broke 😢');
      }
    });

    window.electron.ipcRenderer.sendMessage('set-auth', [{ pass, authToken }]);
  }

  async function getAuthToken(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();

    if (!passwordRef.current?.value) {
      console.log('no pass ');
      return;
    }

    const pass = passwordRef.current.value;
    console.log(`Getting auth token with: ${pass}`);

    window.electron.ipcRenderer.once('get-auth', async (arg) => {
      const authToken = arg as string;
      if (!authToken) {
        alert('Password is incorrect');
        return;
      }

      const octokit = await authenticateWithGithub(authToken);
      if (!octokit) {
        alert('Your auth token is invalid. Please set a new one.');
        setDisplayAuthInput(true);
      } else {
        setOctokit(octokit);
        navigate('/app');
      }
    });

    passwordRef.current.value = '';
    window.electron.ipcRenderer.sendMessage('get-auth', [{ pass }]);
  }

  return (
    <div className="bg-zinc-900 h-screen">
      {/* Must set auth file */}
      {displayAuthInput && (
        <div className="bg-zinc-900 text-gray-300 flex min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8">
            <div>
              <img
                className="mx-auto h-12 w-auto"
                src="https://tailwindui.com/img/logos/mark.svg?color=cyan&shade=500"
                alt="Enki"
              />
              <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-300">
                Set your auth token
              </h2>
            </div>
            <form className="mt-8 space-y-6" onSubmit={setAuthToken}>
              <input type="hidden" name="remember" defaultValue="true" />
              <div className="-space-y-px rounded-md shadow-sm">
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    ref={passwordRef}
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="bg-slate-700 relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-300 placeholder-gray-500 focus:z-10 focus:border-cyan-500 focus:outline-none focus:ring-cyan-500 sm:text-sm"
                    placeholder="Password"
                  />
                </div>
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                  <label htmlFor="authToken" className="sr-only">
                    Auth Token
                  </label>
                  <input
                    ref={authTokenRef}
                    id="authToken"
                    name="authToken"
                    type="authToken"
                    autoComplete="authToken"
                    required
                    className="bg-slate-700 relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-300 placeholder-gray-500 focus:z-10 focus:border-cyan-500 focus:outline-none focus:ring-cyan-500 sm:text-sm"
                    placeholder="Auth Token"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="group relative flex w-full justify-center rounded-md border border-transparent bg-cyan-600 py-2 px-4 text-sm font-medium text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                >
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <LockClosedIcon
                      className="h-5 w-5 text-cyan-500 group-hover:text-cyan-400"
                      aria-hidden="true"
                    />
                  </span>
                  Save auth token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth file exists */}
      {!displayAuthInput && (
        <div className="bg-zinc-900 text-gray-300 flex min-h-full items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8">
            <div>
              <img className="mx-auto h-32 w-auto" src={iconFile} alt="Enki" />
              <h2 className="text-center text-3xl font-bold tracking-tight text-gray-300">
                Access your auth token
              </h2>
            </div>
            <form className="mt-8 space-y-6" onSubmit={getAuthToken}>
              <input type="hidden" name="remember" defaultValue="true" />
              <div className="-space-y-px rounded-md shadow-sm">
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                  <label htmlFor="passwordAuthFile" className="sr-only">
                    Password
                  </label>
                  <input
                    ref={passwordRef}
                    id="passwordAuthFile"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="bg-slate-700 relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-300 placeholder-gray-500 focus:z-10 focus:border-cyan-500 focus:outline-none focus:ring-cyan-500 sm:text-sm"
                    placeholder="Password"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="group relative flex w-full justify-center rounded-md border border-transparent bg-cyan-600 py-2 px-4 text-sm font-medium text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                >
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <LockClosedIcon
                      className="h-5 w-5 text-cyan-500 group-hover:text-cyan-400"
                      aria-hidden="true"
                    />
                  </span>
                  Unlock token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
