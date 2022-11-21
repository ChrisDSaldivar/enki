import { useRef } from 'react';

interface Props {
  updateNoteText: React.Dispatch<React.SetStateAction<string>>;
  innerRef: React.MutableRefObject<null>;
  noteText: string;
}

export default function TextBox(props: Props) {
  const { updateNoteText, noteText } = props;
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  function updateText() {
    if (!noteInputRef.current) {
      return;
    }

    updateNoteText(noteInputRef.current.value);
  }

  return (
    <div>
      <label
        htmlFor="comment"
        className="text-gray-100 block text-sm font-medium"
      >
        Add your note
      </label>
      <div className="mt-1">
        <textarea
          ref={noteInputRef}
          rows={4}
          name="comment"
          id="comment"
          className="bg-zinc-700 block w-full rounded-md border-gray-600 focus:border-green-300 shadow-sm sm:text-sm"
          value={noteText}
          onInput={updateText}
          autoFocus
        />
      </div>
    </div>
  );
}
