import { StyleSheet } from 'react-native';

export const addBookStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
  scannerNoticeContainer: {
    backgroundColor: '#e8f4fd',
    borderColor: '#0369a1',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  scannerNoticeText: {
    color: '#0c4a6e',
    textAlign: 'center',
    fontWeight: '500',
  },
  isbnSection: {
    marginBottom: 16,
  },
  isbnInput: {
    marginBottom: 8,
  },
  isbnActionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  duplicateWarningContainer: {
    backgroundColor: '#fff8e1',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  duplicateWarningText: {
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '500',
  },
  input: {
    marginBottom: 16,
  },
  lookupButton: {
    flex: 1,
    marginTop: 0,
    marginBottom: 0,
  },
  scanButton: {
    flex: 1,
    marginTop: 0,
    marginBottom: 0,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  offlineHint: {
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  scannerModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  sectionActionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  sectionActionButton: {
    marginVertical: 0,
  },
  selectedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  emptyHint: {
    color: '#64748b',
    marginBottom: 16,
  },
  categoriesLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
});

export default addBookStyles;
