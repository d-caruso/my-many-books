import React from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Author, Category } from '@/types';
import { BarcodeScannerPanel } from '@/components/scanner/BarcodeScannerPanel';
import { AddAuthorDialog } from './AddAuthorDialog';
import { AddCategoryDialog } from './AddCategoryDialog';
import { AuthorSelectorModal } from './AuthorSelectorModal';
import { CategorySelectorModal } from './CategorySelectorModal';
import { addBookStyles as styles } from './addBookStyles';

interface AddBookOverlaysProps {
  scannerOpen: boolean;
  onScannerClose: () => void;
  onScannerDetected: (isbn: string) => void;
  authorSelectorOpen: boolean;
  availableAuthors: Author[];
  selectedAuthorIds: number[];
  authorsLoading: boolean;
  onCloseAuthorSelector: () => void;
  onSelectAuthor: (author: Author) => void;
  onOpenAddAuthorFromSelector: () => void;
  categorySelectorOpen: boolean;
  availableCategories: Category[];
  selectedCategoryIds: number[];
  categoriesLoading: boolean;
  onCloseCategorySelector: () => void;
  onToggleCategory: (categoryId: number) => void;
  onOpenAddCategoryFromSelector: () => void;
  addAuthorDialogOpen: boolean;
  onCloseAddAuthorDialog: () => void;
  onCreateAuthor: (input: { name: string; surname: string; nationality?: string }) => Promise<Author>;
  addCategoryDialogOpen: boolean;
  onCloseAddCategoryDialog: () => void;
  onCreateCategory: (input: { name: string }) => Promise<Category>;
}

export function AddBookOverlays(props: AddBookOverlaysProps) {
  return (
    <>
      <Modal
        visible={props.scannerOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={props.onScannerClose}
      >
        <SafeAreaView style={styles.scannerModalContainer}>
          <BarcodeScannerPanel onDetected={props.onScannerDetected} onClose={props.onScannerClose} />
        </SafeAreaView>
      </Modal>

      <AuthorSelectorModal
        visible={props.authorSelectorOpen}
        authors={props.availableAuthors}
        selectedAuthorIds={props.selectedAuthorIds}
        loading={props.authorsLoading}
        onClose={props.onCloseAuthorSelector}
        onSelectAuthor={props.onSelectAuthor}
        onAddAuthorPress={props.onOpenAddAuthorFromSelector}
      />

      <CategorySelectorModal
        visible={props.categorySelectorOpen}
        categories={props.availableCategories}
        selectedCategoryIds={props.selectedCategoryIds}
        loading={props.categoriesLoading}
        onClose={props.onCloseCategorySelector}
        onToggleCategory={props.onToggleCategory}
        onAddCategoryPress={props.onOpenAddCategoryFromSelector}
      />

      <AddAuthorDialog
        visible={props.addAuthorDialogOpen}
        onClose={props.onCloseAddAuthorDialog}
        onCreated={() => undefined}
        onCreate={props.onCreateAuthor}
      />

      <AddCategoryDialog
        visible={props.addCategoryDialogOpen}
        onClose={props.onCloseAddCategoryDialog}
        onCreated={() => undefined}
        onCreate={props.onCreateCategory}
      />
    </>
  );
}

export default AddBookOverlays;
