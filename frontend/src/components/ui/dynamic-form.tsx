import React from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { Input } from './input';
import { Select } from './select';
import { Textarea } from './textarea';
import { InfoTooltip } from './info-tooltip';
import { SearchableSelect } from './searchable-select';
import { DatePicker } from './DatePicker';
import { CustomSelect } from './CustomSelect';
import { cn } from '@/lib/utils';

export type FormFieldType = 'text' | 'email' | 'number' | 'password' | 'select' | 'textarea' | 'checkbox' | 'date' | 'custom';

export interface FormFieldOption {
  value: string | number;
  label: string;
}

export interface FormFieldConfig {
  name: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  options?: FormFieldOption[]; // For select fields
  tooltip?: string;
  colSpan?: 1 | 2; // For grid layout, default 1
  required?: boolean;
  step?: string; // For number fields
  description?: string; // For checkbox fields usually
  render?: (form: UseFormReturn<any>) => React.ReactNode; // For custom rendering
  searchable?: boolean;
  creatable?: boolean;
  onCreate?: (inputValue: string) => void | Promise<void>;
  dependsOn?: string; // Optional field dependency
}

export interface FormSectionConfig {
  title?: string;
  description?: string;
  fields: FormFieldConfig[];
  className?: string;
}

interface DynamicFormProps {
  id?: string;
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  sections: FormSectionConfig[];
  className?: string;
  children?: React.ReactNode;
  controlSize?: 'default' | 'sm';
}

export function DynamicForm({ id, form, onSubmit, sections, className, children, controlSize = 'default' }: DynamicFormProps) {
  const { register, formState: { errors } } = form;

  const renderField = (field: FormFieldConfig) => {
    const error = errors[field.name];
    const errorMessage = error?.message as string | undefined;

    switch (field.type) {
      case 'custom':
        return (
          <div className={cn(controlSize === 'sm' ? "space-y-1.5" : "space-y-2", field.colSpan === 2 && "md:col-span-2")}>
            {field.render && field.render(form)}
          </div>
        );

      case 'checkbox':
        return (
          <label className={cn(
            "flex items-start rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors",
            controlSize === 'sm' ? "gap-2.5 p-2 border border-slate-200/80 dark:border-white/[0.06]" : "gap-3 p-3 border border-slate-200 dark:border-white/10"
          )}>
            <input
              type="checkbox"
              {...register(field.name)}
              className={cn(
                "rounded border-slate-300 text-primary-600 focus:ring-primary-500",
                controlSize === 'sm' ? "mt-0.5 w-4 h-4" : "mt-0.5 w-5 h-5"
              )}
            />
            <div>
              <p className={cn("font-semibold text-slate-800 dark:text-slate-200", controlSize === 'sm' ? "text-xs" : "text-sm")}>
                {field.label}
              </p>
              {field.description && (
                <p className="text-xs text-slate-500 mt-1">{field.description}</p>
              )}
            </div>
          </label>
        );

      case 'date':
        return (
          <div className={cn(controlSize === 'sm' ? "space-y-1.5" : "space-y-2", field.colSpan === 2 && "md:col-span-2")}>
            <div className="flex items-center">
              <label className={cn("font-semibold text-slate-700 dark:text-slate-300", controlSize === 'sm' ? "text-xs" : "text-sm")}>
                {field.label} {field.required && '*'}
              </label>
              {field.tooltip && <InfoTooltip text={field.tooltip} />}
            </div>
            <Controller
              control={form.control}
              name={field.name}
              render={({ field: { value, onChange } }) => (
                <DatePicker
                  value={value || ''}
                  onChange={(val) => {
                    onChange(val);
                    form.trigger(field.name);
                  }}
                  placeholder={field.placeholder}
                  controlSize={controlSize}
                />
              )}
            />
            {field.description && <p className="text-xs text-slate-500">{field.description}</p>}
            {errorMessage && <span className="text-red-500 text-xs">{errorMessage}</span>}
          </div>
        );

      case 'select':
        return (
          <div className={cn(controlSize === 'sm' ? "space-y-1.5" : "space-y-2", field.colSpan === 2 && "md:col-span-2")}>
            <div className="flex items-center">
              <label className={cn("font-semibold text-slate-700 dark:text-slate-300", controlSize === 'sm' ? "text-xs" : "text-sm")}>
                {field.label} {field.required && '*'}
              </label>
              {field.tooltip && <InfoTooltip text={field.tooltip} />}
            </div>
            {field.searchable ? (
              <Controller
                control={form.control}
                name={field.name}
                render={({ field: { value, onChange } }) => (
                  <SearchableSelect
                    options={field.options || []}
                    value={value}
                    onChange={(val) => {
                      // Call onChange and trigger validation
                      onChange(val);
                      form.trigger(field.name);
                    }}
                    placeholder={field.placeholder}
                    error={errorMessage}
                    creatable={field.creatable}
                    onCreate={field.onCreate}
                    controlSize={controlSize}
                  />
                )}
              />
            ) : (
              <Controller
                control={form.control}
                name={field.name}
                render={({ field: { value, onChange } }) => (
                  <CustomSelect
                    options={field.options?.map(opt => ({ value: String(opt.value), label: opt.label })) || []}
                    value={value != null ? String(value) : undefined}
                    onChange={(val) => {
                      onChange(val);
                      form.trigger(field.name);
                    }}
                    placeholder={field.placeholder || "Select option"}
                  />
                )}
              />
            )}
            {field.description && <p className="text-xs text-slate-500">{field.description}</p>}
            {errorMessage && <span className="text-red-500 text-xs">{errorMessage}</span>}
          </div>
        );

      case 'textarea':
        return (
          <div className={cn(controlSize === 'sm' ? "space-y-1.5" : "space-y-2", field.colSpan === 2 && "md:col-span-2")}>
            <div className="flex items-center">
              <label className={cn("font-semibold text-slate-700 dark:text-slate-300", controlSize === 'sm' ? "text-xs" : "text-sm")}>
                {field.label} {field.required && '*'}
              </label>
              {field.tooltip && <InfoTooltip text={field.tooltip} />}
            </div>
            <Textarea
              {...register(field.name)}
              placeholder={field.placeholder}
              rows={4}
            />
            {field.description && <p className="text-xs text-slate-500">{field.description}</p>}
            {errorMessage && <span className="text-red-500 text-xs">{errorMessage}</span>}
          </div>
        );

      default:
        // text, email, number, password
        return (
          <div className={cn(controlSize === 'sm' ? "space-y-1.5" : "space-y-2", field.colSpan === 2 && "md:col-span-2")}>
            <div className="flex items-center">
              <label className={cn("font-semibold text-slate-700 dark:text-slate-300", controlSize === 'sm' ? "text-xs" : "text-sm")}>
                {field.label} {field.required && '*'}
              </label>
              {field.tooltip && <InfoTooltip text={field.tooltip} />}
            </div>
            <Input
              type={field.type}
              {...register(field.name)}
              placeholder={field.placeholder}
              step={field.step}
              controlSize={controlSize}
            />
            {field.description && <p className="text-xs text-slate-500">{field.description}</p>}
            {errorMessage && <span className="text-red-500 text-xs">{errorMessage}</span>}
          </div>
        );
    }
  };

  return (
    <form id={id} onSubmit={form.handleSubmit(onSubmit)} className={cn(controlSize === 'sm' ? "space-y-4" : "space-y-6", className)}>
      {sections.map((section, idx) => (
        <div key={idx} className={section.className}>
          {section.title && (
            <h3 className={cn("font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/5 pb-2", controlSize === 'sm' ? "text-xs mb-3" : "text-sm mb-4")}>
              {section.title}
            </h3>
          )}
          {section.description && (
            <p className={cn("text-slate-500", controlSize === 'sm' ? "text-xs mb-3" : "text-sm mb-4")}>{section.description}</p>
          )}
          <div className={cn("grid grid-cols-1 md:grid-cols-2", controlSize === 'sm' ? "gap-3" : "gap-4")}>
            {section.fields.map((field) => (
              <React.Fragment key={field.name}>
                {renderField(field)}
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
      {children}
    </form>
  );
}
