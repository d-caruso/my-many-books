// Module declarations for better TypeScript support

declare module '*.png' {
  const value: number;
  export = value;
}

declare module '*.jpg' {
  const value: number;
  export = value;
}

declare module '*.jpeg' {
  const value: number;
  export = value;
}

declare module '*.gif' {
  const value: number;
  export = value;
}

declare module '*.svg' {
  const value: number;
  export = value;
}

// Expo Router module augmentation
declare module 'expo-router' {
  export interface RouterType {
    push: (href: string, options?: any) => void;
    replace: (href: string, options?: any) => void;
    back: () => void;
    canGoBack: () => boolean;
  }
  
  export const router: RouterType;
  export const Stack: any;
  export const Tabs: any;
  export const Redirect: any;
  export function useLocalSearchParams<T = any>(): T;
}

// React Native Paper types
declare module 'react-native-paper' {
  export interface MD3Colors {
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondary: string;
    onSecondary: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    tertiary: string;
    onTertiary: string;
    tertiaryContainer: string;
    onTertiaryContainer: string;
    error: string;
    onError: string;
    errorContainer: string;
    onErrorContainer: string;
    background: string;
    onBackground: string;
    surface: string;
    onSurface: string;
    surfaceVariant: string;
    onSurfaceVariant: string;
    outline: string;
    outlineVariant: string;
    shadow: string;
    scrim: string;
    inverseSurface: string;
    inverseOnSurface: string;
    inversePrimary: string;
    elevation: {
      level0: string;
      level1: string;
      level2: string;
      level3: string;
      level4: string;
      level5: string;
    };
    surfaceDisabled: string;
    onSurfaceDisabled: string;
    backdrop: string;
  }

  export interface MD3Theme {
    dark: boolean;
    mode?: 'adaptive' | 'exact';
    roundness: number;
    colors: MD3Colors;
    fonts: any;
    animation: any;
  }

  export const MD3LightTheme: MD3Theme;
  export const MD3DarkTheme: MD3Theme;

  // Components
  export const Button: React.ComponentType<any>;
  export const Text: React.ComponentType<any>;
  export const TextInput: React.ComponentType<any>;
  export const Card: React.ComponentType<any> & {
    Content: React.ComponentType<any>;
    Actions: React.ComponentType<any>;
    Cover: React.ComponentType<any>;
    Title: React.ComponentType<any>;
  };
  export const Chip: React.ComponentType<any>;
  export const IconButton: React.ComponentType<any>;
  export const Menu: React.ComponentType<any> & {
    Item: React.ComponentType<any>;
  };
  export const Appbar: React.ComponentType<any> & {
    Header: React.ComponentType<any>;
    Content: React.ComponentType<any>;
    Action: React.ComponentType<any>;
    BackAction: React.ComponentType<any>;
  };
  export const Avatar: React.ComponentType<any> & {
    Image: React.ComponentType<any>;
    Icon: React.ComponentType<any>;
    Text: React.ComponentType<any>;
  };
  export const Badge: React.ComponentType<any>;
  export const Banner: React.ComponentType<any>;
  export const BottomNavigation: React.ComponentType<any> & {
    Bar: React.ComponentType<any>;
  };
  export const Checkbox: React.ComponentType<any>;
  export const DataTable: React.ComponentType<any> & {
    Header: React.ComponentType<any>;
    Row: React.ComponentType<any>;
    Cell: React.ComponentType<any>;
    Title: React.ComponentType<any>;
    Pagination: React.ComponentType<any>;
  };
  export const Dialog: React.ComponentType<any> & {
    Actions: React.ComponentType<any>;
    Content: React.ComponentType<any>;
    Title: React.ComponentType<any>;
    ScrollArea: React.ComponentType<any>;
    Icon: React.ComponentType<any>;
  };
  export const Divider: React.ComponentType<any>;
  export const Drawer: React.ComponentType<any> & {
    Section: React.ComponentType<any>;
    Item: React.ComponentType<any>;
    CollapsedItem: React.ComponentType<any>;
  };
  export const FAB: React.ComponentType<any> & {
    Group: React.ComponentType<any>;
  };
  export const HelperText: React.ComponentType<any>;
  export const List: React.ComponentType<any> & {
    Accordion: React.ComponentType<any>;
    AccordionGroup: React.ComponentType<any>;
    Icon: React.ComponentType<any>;
    Item: React.ComponentType<any>;
    Section: React.ComponentType<any>;
    Subheader: React.ComponentType<any>;
  };
  export const Modal: React.ComponentType<any>;
  export const Portal: React.ComponentType<any>;
  export const ProgressBar: React.ComponentType<any>;
  export const RadioButton: React.ComponentType<any> & {
    Group: React.ComponentType<any>;
    Item: React.ComponentType<any>;
  };
  export const Searchbar: React.ComponentType<any>;
  export const SegmentedButtons: React.ComponentType<any>;
  export const Snackbar: React.ComponentType<any>;
  export const Surface: React.ComponentType<any>;
  export const Switch: React.ComponentType<any>;
  export const ToggleButton: React.ComponentType<any> & {
    Group: React.ComponentType<any>;
    Row: React.ComponentType<any>;
  };
  export const Tooltip: React.ComponentType<any>;
  export const ActivityIndicator: React.ComponentType<any>;
  export const PaperProvider: React.ComponentType<any>;
}

// AsyncStorage module
declare module '@react-native-async-storage/async-storage' {
  export interface AsyncStorageStatic {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    multiGet(keys: string[]): Promise<[string, string | null][]>;
    multiSet(keyValuePairs: [string, string][]): Promise<void>;
    multiRemove(keys: string[]): Promise<void>;
    clear(): Promise<void>;
    getAllKeys(): Promise<string[]>;
  }

  const AsyncStorage: AsyncStorageStatic;
  export default AsyncStorage;
}

// Expo Camera module
declare module 'expo-camera' {
  export interface CameraPermissionResponse {
    status: 'granted' | 'denied' | 'undetermined';
    expires: string;
    canAskAgain: boolean;
    granted: boolean;
  }

  export class Camera {
    static requestCameraPermissionsAsync(): Promise<CameraPermissionResponse>;
    static getCameraPermissionsAsync(): Promise<CameraPermissionResponse>;
  }
}

// Expo Barcode Scanner module
declare module 'expo-barcode-scanner' {
  export interface BarCodeEvent {
    type: string;
    data: string;
  }

  export interface BarCodeScannerProps {
    onBarCodeScanned?: (data: BarCodeEvent) => void;
    style?: any;
  }

  export class BarCodeScanner extends React.Component<BarCodeScannerProps> {
    static requestPermissionsAsync(): Promise<CameraPermissionResponse>;
    static getPermissionsAsync(): Promise<CameraPermissionResponse>;
  }
}

// React Native module declaration
declare module 'react-native' {
  export interface ViewStyle {
    [key: string]: any;
  }
  
  export interface TextStyle {
    [key: string]: any;
  }
  
  export interface ImageStyle {
    [key: string]: any;
  }
  
  export interface StyleProp<T> {
    [key: string]: any;
  }
  
  export const View: React.ComponentType<any>;
  export const Text: React.ComponentType<any>;
  export const Image: React.ComponentType<any>;
  export const ScrollView: React.ComponentType<any>;
  export const TouchableOpacity: React.ComponentType<any>;
  export const Pressable: React.ComponentType<any>;
  export const TextInput: React.ComponentType<any>;
  export const StyleSheet: {
    create: <T>(styles: T) => T;
    flatten: (style: any) => any;
  };
  export const Dimensions: {
    get: (dim: 'window' | 'screen') => { width: number; height: number; scale: number; fontScale: number };
  };
  export const Platform: {
    OS: 'ios' | 'android' | 'web' | 'windows' | 'macos';
    Version: string | number;
    select: <T>(specifics: { ios?: T; android?: T; web?: T; default: T }) => T;
  };
}

// React module declaration
declare module 'react' {
  export interface Component<P = {}, S = {}, SS = any> {}
  export class Component<P, S> {
    constructor(props: P);
    setState<K extends keyof S>(
      state: ((prevState: Readonly<S>, props: Readonly<P>) => (Pick<S, K> | S | null)) | (Pick<S, K> | S | null),
      callback?: () => void
    ): void;
    render(): ReactNode;
  }

  export interface FunctionComponent<P = {}> {
    (props: P & { children?: ReactNode }): ReactElement<any, any> | null;
    propTypes?: any;
    contextTypes?: any;
    defaultProps?: Partial<P>;
    displayName?: string;
  }

  export interface ComponentType<P = {}> {
    (props: P & { children?: ReactNode }): ReactElement<any, any> | null;
  }

  export type FC<P = {}> = FunctionComponent<P>;

  export type ReactElement<P = any, T extends string | ComponentType<any> = string | ComponentType<any>> = {
    type: T;
    props: P;
    key: Key | null;
  };

  export type ReactNode = ReactElement | string | number | ReactFragment | ReactPortal | boolean | null | undefined;
  export type ReactFragment = {} | Iterable<ReactNode>;
  export type ReactPortal = ReactElement;
  export type Key = string | number;

  export interface Attributes {
    key?: Key | null | undefined;
  }

  export interface RefAttributes<T> extends Attributes {
    ref?: Ref<T> | undefined;
  }

  export type Ref<T> = ((instance: T | null) => void) | RefObject<T> | null;

  export interface RefObject<T> {
    readonly current: T | null;
  }

  // Hooks
  export function useState<S>(initialState: S | (() => S)): [S, (newState: S | ((prevState: S) => S)) => void];
  export function useState<S = undefined>(): [S | undefined, (newState: S | undefined | ((prevState: S | undefined) => S | undefined)) => void];
  
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useContext<T>(context: Context<T>): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  export function useMemo<T>(factory: () => T, deps: any[]): T;
  export function useRef<T>(initialValue: T): RefObject<T>;
  export function useRef<T = undefined>(): RefObject<T | undefined>;

  // Context
  export interface Context<T> {
    Provider: ComponentType<{ value: T; children?: ReactNode }>;
    Consumer: ComponentType<{ children: (value: T) => ReactNode }>;
  }

  export function createContext<T>(defaultValue: T): Context<T>;

  // Default export
  const React: {
    Component: typeof Component;
    FC: typeof FunctionComponent;
    FunctionComponent: typeof FunctionComponent;
    ComponentType: ComponentType<any>;
    useState: typeof useState;
    useEffect: typeof useEffect;
    useContext: typeof useContext;
    useCallback: typeof useCallback;
    useMemo: typeof useMemo;
    useRef: typeof useRef;
    createContext: typeof createContext;
    ReactElement: ReactElement;
    ReactNode: ReactNode;
    Fragment: ComponentType<{ children?: ReactNode }>;
  };
  export default React;
}

// React JSX Runtime
declare module 'react/jsx-runtime' {
  export default any;
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

// Expo Vector Icons
declare module '@expo/vector-icons' {
  export const MaterialIcons: any;
  export const Ionicons: any;
  export const FontAwesome: any;
  export const AntDesign: any;
  export const Feather: any;
}

// React Native Safe Area Context
declare module 'react-native-safe-area-context' {
  export const SafeAreaProvider: React.ComponentType<{ children: React.ReactNode }>;
  export const SafeAreaView: React.ComponentType<any>;
  export const useSafeAreaInsets: () => any;
}

// Node.js globals
declare var require: {
  (id: string): any;
};

declare var process: {
  env: {
    [key: string]: string | undefined;
  };
};

declare var global: any;
declare var __dirname: string;
declare var __filename: string;

// Jest globals
declare var jest: {
  fn: (implementation?: any) => any;
  mock: (moduleName: string, factory?: () => any) => any;
  unmock: (moduleName: string) => any;
  doMock: (moduleName: string, factory?: () => any) => any;
  dontMock: (moduleName: string) => any;
};

declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var test: (name: string, fn: () => void) => void;
declare var expect: (actual: any) => any;
declare var beforeAll: (fn: () => void) => void;
declare var afterAll: (fn: () => void) => void;
declare var beforeEach: (fn: () => void) => void;
declare var afterEach: (fn: () => void) => void;

// Workspace package type declarations
declare module '@my-many-books/shared-types' {
  export * from '../../../libs/shared-types/src/index';
}

declare module '@my-many-books/shared-api' {
  export * from '../../../libs/shared-api/src/index';
}

declare module '@my-many-books/shared-utils' {
  export * from '../../../libs/shared-utils/src/index';
}

declare module '@my-many-books/shared-business' {
  export * from '../../../libs/shared-business/src/index';
}