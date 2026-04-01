import React, { useCallback } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { Author, Category } from '@my-many-books/shared-types';
import { BarcodeScannerPanel } from '@/components/scanner/BarcodeScannerPanel';
import { ScannerErrorBoundary } from '@/components/ScannerErrorBoundary';
import { resolveScannedIsbnRoute } from '@/utils/isbnScannerRouting';
import { AddAuthorDialog } from './AddAuthorDialog';
import { AddCategoryDialog } from './AddCategoryDialog';
import { AuthorSelectorModal } from './AuthorSelectorModal';
import { CategorySelectorModal } from './CategorySelectorModal';
import { ManageAuthorsDialog } from './ManageAuthorsDialog';
import { ManageCategoriesDialog } from './ManageCategoriesDialog';
import { useAddBookStyles } from './addBookStyles';

interface AddBookOverlaysProps {
  scannerOpen: boolean;
  onScannerClose: () => void;
  onScannerDetected?: (isbn: string) => void | Promise<void>;
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
  manageAuthorsDialogOpen: boolean;
  onCloseManageAuthorsDialog: () => void;
  onAuthorUpdated: (author: Author) => void;
  onAuthorDeleted: (authorId: number) => void;
  addCategoryDialogOpen: boolean;
  onCloseAddCategoryDialog: () => void;
  onCreateCategory: (input: { name: string }) => Promise<Category>;
  manageCategoriesDialogOpen: boolean;
  onCloseManageCategoriesDialog: () => void;
  onCategoryUpdated: (category: Category) => void;
  onCategoryDeleted: (categoryId: number) => void;
}

export function AddBookOverlays(props: AddBookOverlaysProps) {
  const styles = useAddBookStyles();
  const { onScannerClose, onScannerDetected } = props;
  const handleScannerDetected = useCallback(async (isbn: string) => {
    if (onScannerDetected) {
      await onScannerDetected(isbn);
      return;
    }

    const route = await resolveScannedIsbnRoute(isbn);
    onScannerClose();
    router.replace(route);
  }, [onScannerClose, onScannerDetected]);

  return (
    <>
      <Modal
        visible={props.scannerOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={props.onScannerClose}
      >
        <SafeAreaView style={styles.scannerModalContainer}>
          <ScannerErrorBoundary onClose={props.onScannerClose}>
            <BarcodeScannerPanel onDetected={handleScannerDetected} onClose={props.onScannerClose} />
          </ScannerErrorBoundary>
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

      <ManageAuthorsDialog
        visible={props.manageAuthorsDialogOpen}
        onClose={props.onCloseManageAuthorsDialog}
        onAuthorUpdated={props.onAuthorUpdated}
        onAuthorDeleted={props.onAuthorDeleted}
      />

      <AddCategoryDialog
        visible={props.addCategoryDialogOpen}
        onClose={props.onCloseAddCategoryDialog}
        onCreated={() => undefined}
        onCreate={props.onCreateCategory}
      />

      <ManageCategoriesDialog
        visible={props.manageCategoriesDialogOpen}
        onClose={props.onCloseManageCategoriesDialog}
        onCategoryUpdated={props.onCategoryUpdated}
        onCategoryDeleted={props.onCategoryDeleted}
      />
    </>
  );
}

export default AddBookOverlays;
