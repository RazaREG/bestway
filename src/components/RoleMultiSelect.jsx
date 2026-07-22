import React from "react";
import { FiX, FiChevronDown, FiCheck } from "react-icons/fi";

/**
 * @param {{
 *   options: { key: string, label: string, role: string, roleId?: string | null, group?: string }[],
 *   value: { role: string, role_id?: string | null }[],
 *   onChange: (roles: { role: string, role_id?: string | null }[]) => void,
 *   error?: string,
 *   placeholder?: string,
 *   disabled?: boolean,
 * }} props
 */
export default function RoleMultiSelect({
  options,
  value,
  onChange,
  error,
  placeholder = "Select roles…",
  disabled = false,
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef(null);

  const isSelected = (opt) =>
    value.some(
      (r) => r.role === opt.role && (r.role_id || null) === (opt.roleId || null)
    );

  const toggleOption = (opt) => {
    if (isSelected(opt)) {
      onChange(
        value.filter(
          (r) =>
            !(r.role === opt.role && (r.role_id || null) === (opt.roleId || null))
        )
      );
    } else {
      onChange([...value, { role: opt.role, role_id: opt.roleId || null }]);
    }
  };

  const removeChip = (e, opt) => {
    e.stopPropagation();
    onChange(
      value.filter(
        (r) =>
          !(r.role === opt.role && (r.role_id || null) === (opt.roleId || null))
      )
    );
  };

  const labelFor = (entry) => {
    const opt = options.find(
      (o) => o.role === entry.role && (o.roleId || null) === (entry.role_id || null)
    );
    return opt?.label || entry.role;
  };

  React.useEffect(() => {
    if (!open) return;

    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const grouped = React.useMemo(() => {
    const map = new Map();
    options.forEach((opt) => {
      const g = opt.group || "General";
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(opt);
    });
    return map;
  }, [options]);

  return (
    <div className="role-multi-select" ref={rootRef}>
      <style>
        {`
          .role-multi-select {
            position: relative;
            width: 100%;
          }

          .role-multi-select__control {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 6px;
            min-height: 44px;
            padding: 6px 36px 6px 10px;
            border-radius: 10px;
            border: 1px solid #ced4da;
            background: #fff;
            cursor: pointer;
            transition: border-color .2s ease, box-shadow .2s ease;
          }

          .role-multi-select__control:hover:not(.is-disabled) {
            border-color: #94a3b8;
          }

          .role-multi-select__control.is-open {
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
          }

          .role-multi-select__control.is-invalid {
            border-color: #dc3545;
          }

          .role-multi-select__control.is-invalid.is-open {
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15);
          }

          .role-multi-select__control.is-disabled {
            background: #e9ecef;
            cursor: not-allowed;
            opacity: 0.85;
          }

          .role-multi-select__placeholder {
            color: #6c757d;
            font-size: 14px;
            padding: 4px 2px;
          }

          .role-multi-select__chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            max-width: 100%;
            padding: 4px 6px 4px 10px;
            border-radius: 999px;
            background: #e7f0ff;
            border: 1px solid #bfdbfe;
            color: #1e40af;
            font-size: 12px;
            font-weight: 600;
            line-height: 1.2;
          }

          .role-multi-select__chip-remove {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            padding: 0;
            border: none;
            border-radius: 999px;
            background: rgba(30, 64, 175, 0.12);
            color: #1e40af;
            cursor: pointer;
            flex-shrink: 0;
            transition: background .15s ease, color .15s ease;
          }

          .role-multi-select__chip-remove:hover {
            background: #dc3545;
            color: #fff;
          }

          .role-multi-select__chevron {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #64748b;
            pointer-events: none;
            transition: transform .2s ease;
          }

          .role-multi-select__chevron.is-open {
            transform: translateY(-50%) rotate(180deg);
          }

          .role-multi-select__menu {
            position: absolute;
            z-index: 1060;
            left: 0;
            right: 0;
            margin-top: 6px;
            max-height: 240px;
            overflow-y: auto;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            background: #fff;
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14);
          }

          .role-multi-select__group-label {
            padding: 8px 14px 4px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #64748b;
          }

          .role-multi-select__option {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            width: 100%;
            padding: 10px 14px;
            border: none;
            background: transparent;
            text-align: left;
            font-size: 14px;
            color: #0f172a;
            cursor: pointer;
            transition: background .15s ease;
          }

          .role-multi-select__option:hover {
            background: #f1f5f9;
          }

          .role-multi-select__option.is-selected {
            background: #eff6ff;
            color: #1d4ed8;
            font-weight: 600;
          }

          .role-multi-select__check {
            color: #2563eb;
            flex-shrink: 0;
          }

          .role-multi-select__error {
            margin-top: 6px;
            font-size: 12px;
            color: #dc3545;
            font-weight: 500;
          }
        `}
      </style>

      <div
        className={[
          "role-multi-select__control",
          open && "is-open",
          error && "is-invalid",
          disabled && "is-disabled",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
      >
        {value.length === 0 ? (
          <span className="role-multi-select__placeholder">{placeholder}</span>
        ) : (
          value.map((entry) => {
            const opt = options.find(
              (o) =>
                o.role === entry.role && (o.roleId || null) === (entry.role_id || null)
            );
            if (!opt) return null;
            return (
              <span key={opt.key} className="role-multi-select__chip">
                <span className="text-truncate">{labelFor(entry)}</span>
                <button
                  type="button"
                  className="role-multi-select__chip-remove"
                  aria-label={`Remove ${labelFor(entry)}`}
                  onClick={(e) => removeChip(e, opt)}
                  disabled={disabled}
                >
                  <FiX size={12} />
                </button>
              </span>
            );
          })
        )}

        <FiChevronDown
          size={18}
          className={`role-multi-select__chevron${open ? " is-open" : ""}`}
        />
      </div>

      {open && !disabled && (
        <div className="role-multi-select__menu" role="listbox">
          {[...grouped.entries()].map(([group, opts]) => (
            <div key={group}>
              {grouped.size > 1 && (
                <div className="role-multi-select__group-label">{group}</div>
              )}
              {opts.map((opt) => {
                const selected = isSelected(opt);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={[
                      "role-multi-select__option",
                      selected && "is-selected",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(opt);
                    }}
                  >
                    <span>{opt.label}</span>
                    {selected && <FiCheck className="role-multi-select__check" size={16} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {error && <div className="role-multi-select__error">{error}</div>}
    </div>
  );
}
