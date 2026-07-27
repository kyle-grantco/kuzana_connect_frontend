// Labelled input matching the design. Blue focus ring from the brand theme.
export default function Input({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  maxLength,
  inputMode,
  autoFocus,
  className = "",
  ...rest
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs text-slate-500">{label}</span>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        autoFocus={autoFocus}
        className={
          "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-brand-ink " +
          "placeholder:text-slate-400 focus:border-brand-blue focus:outline-none " +
          "focus:ring-2 focus:ring-brand-blue/15 " +
          className
        }
        {...rest}
      />
    </label>
  );
}
