import { parseSelectOptionTypeOptions, SelectOption, useFieldSelector } from '@/application/database-yjs';
import { Tag } from '@/components/_shared/tag';
import { SelectOptionColorMap } from '@/components/database/components/cell/cell.const';
import React, { useCallback, useMemo } from 'react';
import { ReactComponent as CheckIcon } from '@/assets/icons/tick.svg';

export function SelectOptionList({ fieldId, selectedIds }: { fieldId: string; selectedIds: string[] }) {
  const { field } = useFieldSelector(fieldId);
  const typeOption = useMemo(() => {
    if (!field) return null;
    return parseSelectOptionTypeOptions(field);
  }, [field]);

  const renderOption = useCallback(
    (option: SelectOption) => {
      const isSelected = selectedIds.includes(option.id);

      return (
        <div
          key={option.id}
          data-testid={'select-option-list'}
          data-checked={isSelected}
          className={'flex items-center justify-between gap-2 text-xs'}
        >
          <Tag size={'small'} label={option.name} color={SelectOptionColorMap[option.color]} />
          {isSelected && <CheckIcon />}
        </div>
      );
    },
    [selectedIds]
  );

  if (!field || !typeOption) return null;
  return <div className={'flex flex-col gap-2'}>{typeOption.options.map(renderOption)}</div>;
}
