import "../App.css";

interface NavbarProps
{
    activeMode: "wasm" | "js";
    onModeChange: ( mode: "wasm" | "js" ) => void;
}

export function Navbar ( { activeMode, onModeChange }: NavbarProps )
{
    return (
        <nav className="navbar">
            <div className="nav-tabs">
                <button
                    className={ `nav-tab ${activeMode === "wasm" ? "active" : ""
                        }` }
                    onClick={ () => onModeChange( "wasm" ) }
                >
                    WASM Mode
                </button>
                <button
                    className={ `nav-tab ${activeMode === "js" ? "active" : ""}` }
                    onClick={ () => onModeChange( "js" ) }
                >
                    JS Mode
                </button>
            </div>
        </nav>
    );
}
